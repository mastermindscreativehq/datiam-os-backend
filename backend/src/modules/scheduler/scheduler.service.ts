import { eq, and, lte, desc, sql } from 'drizzle-orm';
import { db } from '../../db';
import { scheduled_jobs, automation_runs } from '../../db/schema';
import { AppError } from '../../middleware/errorHandler';
import type { CreateJobInput, UpdateJobInput } from './scheduler.schema';

// ---- Cron Utilities ----

function matchesCronField(field: string, value: number): boolean {
  if (field === '*') return true;
  if (field.startsWith('*/')) {
    const step = parseInt(field.slice(2), 10);
    return value % step === 0;
  }
  if (field.includes('-')) {
    const [lo, hi] = field.split('-').map(Number);
    return value >= lo && value <= hi;
  }
  return parseInt(field, 10) === value;
}

export function matchesCron(expression: string, now: Date): boolean {
  const parts = expression.trim().split(/\s+/);
  if (parts.length !== 5) return false;
  const [min, hour, dom, mon, dow] = parts;
  return (
    matchesCronField(min, now.getMinutes()) &&
    matchesCronField(hour, now.getHours()) &&
    matchesCronField(dom, now.getDate()) &&
    matchesCronField(mon, now.getMonth() + 1) &&
    matchesCronField(dow, now.getDay())
  );
}

function computeNextRunAt(cronExpr: string, from: Date): Date {
  const next = new Date(from);
  next.setSeconds(0, 0);
  next.setMinutes(next.getMinutes() + 1);
  // Scan up to 1 year forward to find the next matching minute
  for (let i = 0; i < 527040; i++) {
    if (matchesCron(cronExpr, next)) return next;
    next.setMinutes(next.getMinutes() + 1);
  }
  return next;
}

// ---- Job Handlers ----

const jobHandlers: Record<string, (payload: Record<string, unknown>) => Promise<Record<string, unknown>>> = {
  fan_sync: async () => {
    const { count } = await import('drizzle-orm');
    const { fan_profiles } = await import('../../db/schema');
    const [row] = await db.select({ count: count() }).from(fan_profiles);
    return { fans_checked: Number(row.count), action: 'fan_score_sync_scheduled' };
  },
  release_reminder: async () => {
    const { ne, sql: s } = await import('drizzle-orm');
    const { releases } = await import('../../db/schema');
    const today = new Date().toISOString().split('T')[0];
    const in7 = new Date();
    in7.setDate(in7.getDate() + 7);
    const in7Str = in7.toISOString().split('T')[0];
    const upcoming = await db
      .select()
      .from(releases)
      .where(s`${releases.release_date} >= ${today} AND ${releases.release_date} <= ${in7Str}`);
    return { upcoming_releases: upcoming.length, releases: upcoming.map((r) => r.release_title) };
  },
  content_suggestion: async () => {
    const { count } = await import('drizzle-orm');
    const { content_ideas } = await import('../../db/schema');
    const [row] = await db
      .select({ count: count() })
      .from(content_ideas)
      .where(sql`${content_ideas.status} = 'idea'`);
    return { pending_ideas: Number(row.count) };
  },
  royalty_import: async () => ({ status: 'placeholder', note: 'connect_royalty_feed_to_activate' }),
  sync_follow_up: async () => {
    const { sync_pitches } = await import('../../db/schema');
    const today = new Date().toISOString().split('T')[0];
    const due = await db
      .select()
      .from(sync_pitches)
      .where(
        sql`${sync_pitches.follow_up_date} <= ${today}
          AND ${sync_pitches.status} NOT IN ('accepted','rejected')`,
      )
      .limit(20);
    return { follow_ups_due: due.length, pitches: due.map((p) => p.pitch_target) };
  },
  analytics_snapshot: async () => {
    const { count, sum } = await import('drizzle-orm');
    const { songs, fan_profiles, royalty_sources } = await import('../../db/schema');
    const [[songRow], [fanRow], [revRow]] = await Promise.all([
      db.select({ count: count() }).from(songs),
      db.select({ count: count() }).from(fan_profiles),
      db.select({ total: sum(royalty_sources.amount) }).from(royalty_sources),
    ]);
    return {
      songs: Number(songRow.count),
      fans: Number(fanRow.count),
      revenue: revRow.total ? parseFloat(revRow.total) : 0,
      snapshot_at: new Date().toISOString(),
    };
  },
};

// ---- CRUD ----

export const createJob = async (input: CreateJobInput) => {
  const runOnceAt = input.run_once_at ? new Date(input.run_once_at) : undefined;
  const nextRunAt = input.cron_expression
    ? computeNextRunAt(input.cron_expression, new Date())
    : runOnceAt;

  const [job] = await db
    .insert(scheduled_jobs)
    .values({
      job_name: input.job_name,
      job_type: input.job_type,
      cron_expression: input.cron_expression,
      run_once_at: runOnceAt,
      payload: input.payload ?? {},
      status: 'active',
      next_run_at: nextRunAt,
    })
    .returning();
  return job;
};

export const listJobs = async () => {
  return db.select().from(scheduled_jobs).orderBy(desc(scheduled_jobs.created_at));
};

export const getJobById = async (id: string) => {
  const [job] = await db
    .select()
    .from(scheduled_jobs)
    .where(eq(scheduled_jobs.id, id))
    .limit(1);
  if (!job) throw new AppError('Job not found', 404);
  return job;
};

export const updateJob = async (id: string, input: UpdateJobInput) => {
  const existing = await getJobById(id);
  const updates: Partial<typeof existing> = { updated_at: new Date() };

  if (input.job_name) updates.job_name = input.job_name;
  if (input.status) updates.status = input.status;
  if (input.payload) updates.payload = input.payload;
  if (input.cron_expression) {
    updates.cron_expression = input.cron_expression;
    updates.next_run_at = computeNextRunAt(input.cron_expression, new Date());
  }

  const [updated] = await db
    .update(scheduled_jobs)
    .set(updates)
    .where(eq(scheduled_jobs.id, id))
    .returning();
  return updated;
};

export const deleteJob = async (id: string) => {
  await getJobById(id);
  await db.delete(scheduled_jobs).where(eq(scheduled_jobs.id, id));
};

export const triggerJob = async (id: string) => {
  const job = await getJobById(id);
  return executeJob(job);
};

// ---- Execution ----

export const executeJob = async (job: typeof scheduled_jobs.$inferSelect) => {
  const handler = jobHandlers[job.job_type];
  const payload = (job.payload as Record<string, unknown>) ?? {};

  let result: Record<string, unknown>;
  let runStatus: 'success' | 'failed' = 'success';
  let errorMsg: string | undefined;

  try {
    result = handler ? await handler(payload) : { note: 'no_handler_registered' };
  } catch (err) {
    runStatus = 'failed';
    errorMsg = err instanceof Error ? err.message : String(err);
    result = { error: errorMsg };
  }

  const [runRecord] = await db
    .insert(automation_runs)
    .values({
      workflow_name: `scheduler:${job.job_type}:${job.job_name}`,
      source: 'cron',
      status: runStatus,
      payload,
      result,
    })
    .returning();

  const nextRun = job.cron_expression
    ? computeNextRunAt(job.cron_expression, new Date())
    : undefined;

  await db
    .update(scheduled_jobs)
    .set({
      last_run_at: new Date(),
      run_count: (job.run_count ?? 0) + 1,
      last_error: errorMsg ?? null,
      status: !job.cron_expression ? 'completed' : job.status,
      next_run_at: nextRun,
      updated_at: new Date(),
    })
    .where(eq(scheduled_jobs.id, job.id));

  return { run_id: runRecord.id, job_id: job.id, status: runStatus, result };
};

export const tickScheduler = async () => {
  const now = new Date();
  const jobs = await db
    .select()
    .from(scheduled_jobs)
    .where(eq(scheduled_jobs.status, 'active'));

  const dueJobs = jobs.filter((job) => {
    if (job.run_once_at && job.run_once_at <= now) return true;
    if (job.cron_expression) return matchesCron(job.cron_expression, now);
    return false;
  });

  for (const job of dueJobs) {
    executeJob(job).catch((err) =>
      console.error(`[Scheduler] Job ${job.id} failed:`, err),
    );
  }
};

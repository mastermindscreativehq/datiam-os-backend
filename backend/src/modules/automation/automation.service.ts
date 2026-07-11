import { eq, desc, and, sql } from 'drizzle-orm';
import { db } from '../../db';
import { automation_runs, workflow_registry } from '../../db/schema';
import { AppError } from '../../middleware/errorHandler';
import { logActivity } from '../../lib/activityLogger';
import type {
  WebhookInput,
  CreateRunInput,
  UpdateRunInput,
  RunHistoryQuery,
  CreateWorkflowInput,
  UpdateWorkflowInput,
  TriggerWorkflowInput,
} from './automation.schema';

const N8N_BASE_URL    = process.env.N8N_WEBHOOK_BASE_URL ?? '';
const N8N_SECRET      = process.env.N8N_WEBHOOK_SECRET   ?? '';
const TRIGGER_TIMEOUT = 8000; // ms per attempt

// ── Inbound webhook (n8n → DATIAM) ─────────────────────────────────────────

export const receiveWebhook = async (input: WebhookInput, secret?: string) => {
  const configuredSecret = process.env.N8N_WEBHOOK_SECRET;
  if (configuredSecret && secret !== configuredSecret) {
    throw new AppError('Invalid webhook secret', 401);
  }

  const [run] = await db
    .insert(automation_runs)
    .values({
      workflow_name: input.workflow_name,
      source: input.source ?? 'n8n',
      status: 'running',
      payload: input.payload ?? {},
    })
    .returning();

  logActivity({
    eventType: 'automation_run.logged',
    module: 'automation',
    entityType: 'automation_run',
    entityId: run.id,
    title: `Automation started: ${input.workflow_name}`,
    severity: 'info',
    metadata: { source: input.source ?? 'n8n', runId: run.id },
  });

  await db
    .update(automation_runs)
    .set({ status: 'success', result: { processed: true, processed_at: new Date().toISOString() } })
    .where(eq(automation_runs.id, run.id));

  logActivity({
    eventType: 'automation_run.completed',
    module: 'automation',
    entityType: 'automation_run',
    entityId: run.id,
    title: `Automation completed: ${input.workflow_name}`,
    severity: 'info',
    metadata: { runId: run.id },
  });

  return { run_id: run.id, workflow: input.workflow_name, status: 'success' };
};

// ── Automation Runs CRUD ────────────────────────────────────────────────────

export const getAutomationRuns = async () => {
  return db
    .select()
    .from(automation_runs)
    .orderBy(desc(automation_runs.created_at))
    .limit(50);
};

export const getRunHistory = async (query: RunHistoryQuery) => {
  const conditions = [];
  if (query.status) conditions.push(eq(automation_runs.status, query.status));
  if (query.source) conditions.push(eq(automation_runs.source, query.source));
  if (query.event)  conditions.push(eq(automation_runs.triggered_by_event, query.event));

  const rows = await db
    .select()
    .from(automation_runs)
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(desc(automation_runs.created_at))
    .limit(query.limit)
    .offset(query.offset);

  const [{ total }] = await db
    .select({ total: sql<number>`count(*)::int` })
    .from(automation_runs)
    .where(conditions.length ? and(...conditions) : undefined);

  return { runs: rows, total, limit: query.limit, offset: query.offset };
};

export const createAutomationRun = async (input: CreateRunInput) => {
  const [run] = await db
    .insert(automation_runs)
    .values({
      workflow_name: input.workflow_name,
      source: input.source,
      status: input.status,
      payload: input.payload ?? {},
      result: input.result ?? {},
    })
    .returning();

  const isFailed = input.status === 'failed';
  logActivity({
    eventType: isFailed ? 'automation_run.failed' : 'automation_run.logged',
    module: 'automation',
    entityType: 'automation_run',
    entityId: run.id,
    title: isFailed ? `Automation failed: ${input.workflow_name}` : `Automation run logged: ${input.workflow_name}`,
    severity: isFailed ? 'error' : 'info',
    metadata: { source: input.source, runId: run.id, status: input.status },
  });

  return run;
};

export const updateAutomationRun = async (id: string, input: UpdateRunInput) => {
  const [existing] = await db.select().from(automation_runs).where(eq(automation_runs.id, id)).limit(1);
  if (!existing) throw new AppError('Automation run not found', 404);

  const [run] = await db
    .update(automation_runs)
    .set({ status: input.status, ...(input.result ? { result: input.result } : {}) })
    .where(eq(automation_runs.id, id))
    .returning();

  return run;
};

export const deleteAutomationRun = async (id: string) => {
  const [deleted] = await db.delete(automation_runs).where(eq(automation_runs.id, id)).returning();
  if (!deleted) throw new AppError('Automation run not found', 404);
  return { deleted: true, id, workflow_name: deleted.workflow_name };
};

export const retryRun = async (id: string) => {
  const [run] = await db.select().from(automation_runs).where(eq(automation_runs.id, id)).limit(1);
  if (!run) throw new AppError('Automation run not found', 404);
  if (run.status !== 'failed') throw new AppError('Only failed runs can be retried', 400);

  return triggerByName(run.workflow_name, run.triggered_by_event ?? 'manual.retry', (run.payload as Record<string, unknown>) ?? {});
};

// ── Workflow Registry ───────────────────────────────────────────────────────

export const listWorkflows = async () => {
  return db.select().from(workflow_registry).orderBy(workflow_registry.name);
};

export const getWorkflowById = async (id: string) => {
  const [wf] = await db.select().from(workflow_registry).where(eq(workflow_registry.id, id)).limit(1);
  if (!wf) throw new AppError('Workflow not found', 404);
  return wf;
};

export const createWorkflow = async (input: CreateWorkflowInput) => {
  const [wf] = await db
    .insert(workflow_registry)
    .values({
      name: input.name,
      description: input.description,
      event_triggers: input.event_triggers,
      n8n_workflow_id: input.n8n_workflow_id,
      webhook_path: input.webhook_path,
      is_active: input.is_active ?? true,
      metadata: input.metadata,
      ...(input.retry_policy      !== undefined ? { retry_policy: input.retry_policy }         : {}),
      ...(input.timeout_ms        !== undefined ? { timeout_ms: input.timeout_ms }             : {}),
      ...(input.priority          !== undefined ? { priority: input.priority }                 : {}),
      ...(input.required_inputs   !== undefined ? { required_inputs: input.required_inputs }   : {}),
      ...(input.expected_outputs  !== undefined ? { expected_outputs: input.expected_outputs } : {}),
      ...(input.version           !== undefined ? { version: input.version }                   : {}),
    })
    .returning();

  logActivity({
    eventType: 'workflow.registered',
    module: 'automation',
    entityType: 'workflow_registry',
    entityId: wf.id,
    title: `Workflow registered: ${wf.name}`,
    severity: 'info',
    metadata: { workflowId: wf.id, events: wf.event_triggers },
  });

  return wf;
};

export const updateWorkflow = async (id: string, input: UpdateWorkflowInput) => {
  const [existing] = await db.select().from(workflow_registry).where(eq(workflow_registry.id, id)).limit(1);
  if (!existing) throw new AppError('Workflow not found', 404);

  const [wf] = await db
    .update(workflow_registry)
    .set({
      ...(input.name             !== undefined ? { name: input.name }                       : {}),
      ...(input.description      !== undefined ? { description: input.description }         : {}),
      ...(input.event_triggers   !== undefined ? { event_triggers: input.event_triggers }   : {}),
      ...(input.n8n_workflow_id  !== undefined ? { n8n_workflow_id: input.n8n_workflow_id } : {}),
      ...(input.webhook_path     !== undefined ? { webhook_path: input.webhook_path }       : {}),
      ...(input.is_active        !== undefined ? { is_active: input.is_active }             : {}),
      ...(input.metadata         !== undefined ? { metadata: input.metadata }               : {}),
      ...(input.retry_policy     !== undefined ? { retry_policy: input.retry_policy }         : {}),
      ...(input.timeout_ms       !== undefined ? { timeout_ms: input.timeout_ms }             : {}),
      ...(input.priority         !== undefined ? { priority: input.priority }                 : {}),
      ...(input.required_inputs  !== undefined ? { required_inputs: input.required_inputs }   : {}),
      ...(input.expected_outputs !== undefined ? { expected_outputs: input.expected_outputs } : {}),
      ...(input.version          !== undefined ? { version: input.version }                   : {}),
      updated_at: new Date(),
    })
    .where(eq(workflow_registry.id, id))
    .returning();

  return wf;
};

export const deleteWorkflow = async (id: string) => {
  const [deleted] = await db.delete(workflow_registry).where(eq(workflow_registry.id, id)).returning();
  if (!deleted) throw new AppError('Workflow not found', 404);
  return { deleted: true, id, name: deleted.name };
};

// ── Trigger Engine ──────────────────────────────────────────────────────────

async function attemptFire(
  webhookPath: string,
  payload: Record<string, unknown>,
  timeoutMs: number = TRIGGER_TIMEOUT,
): Promise<{ ok: boolean; status?: number; error?: string; body?: unknown }> {
  if (!N8N_BASE_URL) return { ok: false, error: 'N8N_WEBHOOK_BASE_URL not configured' };

  try {
    const url = `${N8N_BASE_URL}${webhookPath}`;
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type':    'application/json',
        'X-DATIAM-Secret': N8N_SECRET,
        'X-DATIAM-Event':  String(payload.event ?? ''),
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(timeoutMs),
    });
    // n8n workflows that respond synchronously (responseMode: lastNode) return
    // execution metadata (execution id / estimated duration / version) here —
    // callers that need it read result.body. Workflows using the default
    // "onReceived" ack mode return no body, which is fine (body stays undefined).
    let body: unknown;
    try {
      const text = await res.text();
      body = text ? JSON.parse(text) : undefined;
    } catch {
      body = undefined;
    }
    return { ok: res.ok, status: res.status, body };
  } catch (err) {
    return { ok: false, error: (err as Error).message };
  }
}

async function sleep(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}

export const triggerWorkflow = async (workflowId: string, input: TriggerWorkflowInput) => {
  const wf = await getWorkflowById(workflowId);
  if (!wf.is_active) throw new AppError('Workflow is inactive', 400);

  return triggerByName(wf.name, input.event, input.data ?? {}, workflowId);
};

export async function triggerByName(
  workflowName: string,
  event: string,
  data: Record<string, unknown>,
  registryId?: string,
  opts: { missionId?: string } = {},
) {
  // Look up the webhook path + execution contract from registry if not provided
  let webhookPath = '/webhook/release-intelligence';
  let timeoutMs = TRIGGER_TIMEOUT;
  let maxRetries = 3;
  if (registryId) {
    const [wf] = await db.select().from(workflow_registry).where(eq(workflow_registry.id, registryId)).limit(1);
    if (wf?.webhook_path) webhookPath = wf.webhook_path;
    if (wf?.timeout_ms) timeoutMs = wf.timeout_ms;
    if (wf?.retry_policy) maxRetries = (wf.retry_policy as { max_retries?: number }).max_retries ?? maxRetries;
  } else {
    const [wf] = await db.select().from(workflow_registry).where(eq(workflow_registry.name, workflowName)).limit(1);
    if (wf?.webhook_path) webhookPath = wf.webhook_path;
    if (wf?.id) registryId = wf.id;
    if (wf?.timeout_ms) timeoutMs = wf.timeout_ms;
    if (wf?.retry_policy) maxRetries = (wf.retry_policy as { max_retries?: number }).max_retries ?? maxRetries;
  }

  const payload = { event, timestamp: new Date().toISOString(), data };
  const startMs = Date.now();
  let attempt = 0;
  let lastError = '';

  const [run] = await db
    .insert(automation_runs)
    .values({
      workflow_name: workflowName,
      source: 'backend',
      status: 'running',
      payload,
      triggered_by_event: event,
      workflow_registry_id: registryId ?? null,
      mission_id: opts.missionId ?? null,
      max_retries: maxRetries,
    })
    .returning();

  while (attempt < maxRetries) {
    attempt++;
    const result = await attemptFire(webhookPath, payload, timeoutMs);

    if (result.ok) {
      const durationMs = Date.now() - startMs;
      await db
        .update(automation_runs)
        .set({ status: 'success', result: { fired: true, attempt, duration_ms: durationMs, response: result.body ?? null }, duration_ms: durationMs, retry_count: attempt - 1 })
        .where(eq(automation_runs.id, run.id));

      if (registryId) {
        await db
          .update(workflow_registry)
          .set({
            last_run_at: new Date(),
            last_run_status: 'success',
            total_runs: sql`${workflow_registry.total_runs} + 1`,
            success_count: sql`${workflow_registry.success_count} + 1`,
            health_status: 'healthy',
            updated_at: new Date(),
          })
          .where(eq(workflow_registry.id, registryId));
      }

      logActivity({
        eventType: 'automation_run.completed',
        module: 'automation',
        entityType: 'automation_run',
        entityId: run.id,
        title: `Workflow fired: ${workflowName}`,
        severity: 'info',
        metadata: { event, attempt, durationMs, missionId: opts.missionId },
      });

      return { run_id: run.id, workflow: workflowName, status: 'success' as const, attempt, response: result.body };
    }

    lastError = result.error ?? `HTTP ${result.status}`;
    if (attempt < maxRetries) await sleep(1000 * attempt);
  }

  const durationMs = Date.now() - startMs;
  await db
    .update(automation_runs)
    .set({ status: 'failed', error_message: lastError, duration_ms: durationMs, retry_count: attempt - 1, result: { fired: false, attempts: attempt, error: lastError } })
    .where(eq(automation_runs.id, run.id));

  if (registryId) {
    await db
      .update(workflow_registry)
      .set({
        last_run_at: new Date(),
        last_run_status: 'failed',
        total_runs: sql`${workflow_registry.total_runs} + 1`,
        failed_count: sql`${workflow_registry.failed_count} + 1`,
        health_status: 'degraded',
        updated_at: new Date(),
      })
      .where(eq(workflow_registry.id, registryId));
  }

  logActivity({
    eventType: 'automation_run.failed',
    module: 'automation',
    entityType: 'automation_run',
    entityId: run.id,
    title: `Workflow failed: ${workflowName}`,
    severity: 'error',
    metadata: { event, attempts: attempt, error: lastError, missionId: opts.missionId },
  });

  return { run_id: run.id, workflow: workflowName, status: 'failed' as const, attempts: attempt, error: lastError };
}

// ── Dispatch event to all matching workflows ────────────────────────────────

export const dispatchEvent = async (event: string, data: Record<string, unknown>) => {
  const allWorkflows = await db
    .select()
    .from(workflow_registry)
    .where(eq(workflow_registry.is_active, true));

  const matching = allWorkflows.filter(wf =>
    wf.event_triggers.includes(event),
  );

  const results = await Promise.allSettled(
    matching.map(wf =>
      triggerByName(wf.name, event, data, wf.id),
    ),
  );

  return {
    event,
    dispatched: matching.length,
    results: results.map((r, i) => ({
      workflow: matching[i].name,
      status: r.status === 'fulfilled' ? r.value.status : 'error',
      error: r.status === 'rejected' ? String(r.reason) : undefined,
    })),
  };
};

// ── Stats (dashboard) ───────────────────────────────────────────────────────

export const getAutomationStats = async () => {
  const [totals] = await db
    .select({
      total_runs:    sql<number>`count(*)::int`,
      success_count: sql<number>`count(*) filter (where status = 'success')::int`,
      failed_count:  sql<number>`count(*) filter (where status = 'failed')::int`,
      running_count: sql<number>`count(*) filter (where status = 'running')::int`,
    })
    .from(automation_runs);

  const [todayFailed] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(automation_runs)
    .where(sql`status = 'failed' AND created_at >= now() - interval '24 hours'`);

  const [todaySuccess] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(automation_runs)
    .where(sql`status = 'success' AND created_at >= now() - interval '24 hours'`);

  const lastRun = await db
    .select()
    .from(automation_runs)
    .orderBy(desc(automation_runs.created_at))
    .limit(1);

  const workflows = await db.select().from(workflow_registry).orderBy(workflow_registry.name);
  const activeWorkflows  = workflows.filter(w => w.is_active).length;
  const totalWorkflows   = workflows.length;

  const successRate = totals.total_runs > 0
    ? Math.round((totals.success_count / totals.total_runs) * 100)
    : 100;

  const queueHealth =
    totals.running_count > 10 ? 'overloaded' :
    totals.failed_count > totals.total_runs * 0.3 ? 'degraded' :
    todayFailed.count > 0 ? 'warning' : 'healthy';

  return {
    overview: {
      totalWorkflows,
      activeWorkflows,
      totalRuns:    totals.total_runs,
      successCount: totals.success_count,
      failedCount:  totals.failed_count,
      runningCount: totals.running_count,
      successRate,
      queueHealth,
    },
    today: {
      successCount: todaySuccess.count,
      failedCount:  todayFailed.count,
    },
    lastRun: lastRun[0] ?? null,
    workflows,
  };
};

export const getEventTypes = () => ({
  events: [
    // Catalog & Artist events
    'artist.created',
    'artist.updated',
    'song.created',
    'song.updated',
    'catalog.release.created',
    'catalog.release.updated',
    'asset.uploaded',
    'credit.updated',
    'document.uploaded',
    // Release Intelligence events
    'release.created',
    'release.updated',
    'release.published',
    'release.campaign.started',
    'release.campaign.completed',
    // Release Intel (orchestration layer) events
    'release.intel.analyzed',
    'release.intel.brief.generated',
    'release.intel.mission.created',
    'release.intel.failed',
    // Music Links Hub events
    'music_links.created',
    'music_links.updated',
    'music_links.deleted',
    // Growth OS campaign events (previously missing from this list despite being seeded/used)
    'campaign.created',
    // Manual automation dispatch (Artist/Release Intelligence "automation" tab)
    'automation.playlist_pitch.requested',
    'automation.sync_pitch.requested',
    'automation.dj_outreach.requested',
    'automation.blog_outreach.requested',
    'automation.social_scheduling.requested',
    'automation.analytics_updates.requested',
  ],
});

// ── N8n Health Check ────────────────────────────────────────────────────────

export const checkN8nHealth = async () => {
  if (!N8N_BASE_URL) {
    return { status: 'not_configured' as const, url: null, message: 'N8N_WEBHOOK_BASE_URL is not set' };
  }

  try {
    const res = await fetch(`${N8N_BASE_URL}/healthz`, {
      signal: AbortSignal.timeout(5000),
    });
    return {
      status: res.ok ? 'healthy' as const : 'degraded' as const,
      url: N8N_BASE_URL,
      http_status: res.status,
    };
  } catch (err) {
    return {
      status: 'unreachable' as const,
      url: N8N_BASE_URL,
      error: (err as Error).message,
    };
  }
};

// ── Dead-Letter Queue ────────────────────────────────────────────────────────

export const getDeadLetterQueue = async () => {
  const rows = await db
    .select()
    .from(automation_runs)
    .where(
      and(
        eq(automation_runs.status, 'failed'),
        sql`retry_count >= max_retries - 1 AND max_retries > 0`,
      ),
    )
    .orderBy(desc(automation_runs.created_at))
    .limit(100);

  return { total: rows.length, runs: rows };
};

// ── Workflow Registry Seeder ─────────────────────────────────────────────────

export const seedWorkflows = async () => {
  const seeded: typeof workflow_registry.$inferSelect[] = [];

  const releaseExists = await db
    .select({ id: workflow_registry.id })
    .from(workflow_registry)
    .where(eq(workflow_registry.name, 'release-intelligence'))
    .limit(1);

  if (!releaseExists.length) {
    const [wf] = await db
      .insert(workflow_registry)
      .values({
        name: 'release-intelligence',
        description: 'Routes DATIAM Release Intelligence events to n8n handler nodes',
        event_triggers: [
          'release.created',
          'release.updated',
          'release.published',
          'release.campaign.started',
          'release.campaign.completed',
        ],
        webhook_path: '/webhook/release-intelligence',
        is_active: true,
        metadata: { template: 'datiam-release-intelligence-v1' },
      })
      .returning();
    seeded.push(wf);

    logActivity({
      eventType: 'workflow.registered',
      module: 'automation',
      entityType: 'workflow_registry',
      entityId: wf.id,
      title: 'Workflow seeded: release-intelligence',
      severity: 'info',
      metadata: { seeded: true },
    });
  }

  const catalogExists = await db
    .select({ id: workflow_registry.id })
    .from(workflow_registry)
    .where(eq(workflow_registry.name, 'catalog-events'))
    .limit(1);

  if (!catalogExists.length) {
    const [wf] = await db
      .insert(workflow_registry)
      .values({
        name: 'catalog-events',
        description: 'Routes DATIAM Catalog & Artist events to n8n handler nodes',
        event_triggers: [
          'artist.created',
          'artist.updated',
          'song.created',
          'song.updated',
          'catalog.release.created',
          'catalog.release.updated',
          'asset.uploaded',
          'credit.updated',
          'document.uploaded',
        ],
        webhook_path: '/webhook/catalog-events',
        is_active: true,
        metadata: { template: 'datiam-catalog-events-v1' },
      })
      .returning();
    seeded.push(wf);

    logActivity({
      eventType: 'workflow.registered',
      module: 'automation',
      entityType: 'workflow_registry',
      entityId: wf.id,
      title: 'Workflow seeded: catalog-events',
      severity: 'info',
      metadata: { seeded: true },
    });
  }

  // ── Growth OS Workflows ───────────────────────────────────────────────────

  const growthWorkflows: Array<{
    name: string;
    description: string;
    event_triggers: string[];
    webhook_path: string;
    metadata: Record<string, unknown>;
  }> = [
    {
      name: 'growth-publish-post',
      description: 'Publishes scheduled content to social platforms via n8n',
      event_triggers: ['content.publish'],
      webhook_path: '/webhook/publish-post',
      metadata: { template: 'datiam-growth-publish-post-v1', sync: true },
    },
    {
      name: 'growth-analytics-sync',
      description: 'Syncs platform analytics snapshots into DATIAM',
      event_triggers: ['analytics.sync.request'],
      webhook_path: '/webhook/sync-analytics',
      metadata: { template: 'datiam-growth-analytics-sync-v1', sync: true },
    },
    {
      name: 'growth-trend-scan',
      description: 'Scans trend data across social platforms',
      event_triggers: ['trend.scan.request'],
      webhook_path: '/webhook/scan-trends',
      metadata: { template: 'datiam-growth-trend-scan-v1', sync: true },
    },
    {
      name: 'growth-campaign-events',
      description: 'Routes Growth OS campaign lifecycle events',
      event_triggers: ['campaign.created', 'campaign.stage.changed', 'campaign.completed'],
      webhook_path: '/webhook/campaign-events',
      metadata: { template: 'datiam-growth-campaign-events-v1', sync: false },
    },
    {
      name: 'growth-notification-engine',
      description: 'Dispatches Growth OS notifications and alerts',
      event_triggers: ['content.published', 'post.publish.failed', 'analytics.synced', 'trend.detected'],
      webhook_path: '/webhook/notification-engine',
      metadata: { template: 'datiam-growth-notification-engine-v1', sync: false },
    },
  ];

  for (const wfDef of growthWorkflows) {
    const exists = await db
      .select({ id: workflow_registry.id })
      .from(workflow_registry)
      .where(eq(workflow_registry.name, wfDef.name))
      .limit(1);

    if (!exists.length) {
      const [wf] = await db
        .insert(workflow_registry)
        .values({ ...wfDef, is_active: true })
        .returning();
      seeded.push(wf);

      logActivity({
        eventType: 'workflow.registered',
        module: 'automation',
        entityType: 'workflow_registry',
        entityId: wf.id,
        title: `Workflow seeded: ${wfDef.name}`,
        severity: 'info',
        metadata: { seeded: true },
      });
    }
  }

  // ── Release Intel Mission Dispatcher Workflows ────────────────────────────
  // One workflow per mission_type (release_missions.mission_type). Not
  // triggered via dispatchEvent's fan-out — mission.worker.ts calls
  // triggerByName(workflowName, ...) directly by name, so each gets its own
  // dedicated event name to keep the registry's event_triggers meaningful.

  const missionWorkflows: Array<{
    name: string;
    description: string;
    event_triggers: string[];
    webhook_path: string;
    timeout_ms: number;
    priority: number;
    required_inputs: string[];
    expected_outputs: string[];
    metadata: Record<string, unknown>;
  }> = [
    {
      name: 'playlist_pitch',
      description: 'Playlist Intelligence — discovers editorial/curator playlist opportunities and pitches the release',
      event_triggers: ['release.intel.mission.playlist.dispatched'],
      webhook_path: '/webhook/playlist-pitch',
      timeout_ms: 8000,
      priority: 80,
      required_inputs: ['release', 'artist', 'mission', 'metadata', 'priority', 'context'],
      expected_outputs: ['playlists_found', 'editorial_opportunities', 'curator_contacts', 'priority_playlists', 'genre_matching', 'acceptance_probability'],
      metadata: { template: 'datiam-playlist-pitch-v1', mission_type: 'playlist' },
    },
    {
      name: 'sync_pitch',
      description: 'Sync Intelligence — discovers film/TV/game/ad sync licensing opportunities for the release',
      event_triggers: ['release.intel.mission.sync.dispatched'],
      webhook_path: '/webhook/sync-pitch',
      timeout_ms: 8000,
      priority: 60,
      required_inputs: ['release', 'artist', 'mission', 'metadata', 'priority', 'context'],
      expected_outputs: ['film_opportunities', 'tv_opportunities', 'games', 'ads', 'music_supervisors', 'sync_agencies', 'licensing_targets'],
      metadata: { template: 'datiam-sync-pitch-v1', mission_type: 'sync' },
    },
    {
      name: 'fan_growth',
      description: 'Fan Intelligence — cross-platform audience growth analysis and prediction',
      event_triggers: ['release.intel.mission.fan_growth.dispatched'],
      webhook_path: '/webhook/fan-growth',
      timeout_ms: 8000,
      priority: 50,
      required_inputs: ['release', 'artist', 'mission', 'metadata', 'priority', 'context'],
      expected_outputs: ['audience_growth', 'top_countries', 'top_cities', 'follower_velocity', 'fan_overlap', 'growth_prediction'],
      metadata: { template: 'datiam-fan-growth-v1', mission_type: 'fan_growth' },
    },
    {
      name: 'content_calendar',
      description: 'Content Intelligence — generates content ideas, posting schedule, and campaign timeline',
      event_triggers: ['release.intel.mission.content.dispatched'],
      webhook_path: '/webhook/content-calendar',
      timeout_ms: 8000,
      priority: 70,
      required_inputs: ['release', 'artist', 'mission', 'metadata', 'priority', 'context'],
      expected_outputs: ['content_ideas', 'release_calendar', 'posting_schedule', 'captions', 'hooks', 'hashtags', 'campaign_timeline'],
      metadata: { template: 'datiam-content-calendar-v1', mission_type: 'content' },
    },
    {
      name: 'press_outreach',
      description: 'Outreach Intelligence — discovers and contacts blogs, radio, DJs, and curators; runs email campaigns',
      event_triggers: ['release.intel.mission.outreach.dispatched'],
      webhook_path: '/webhook/press-outreach',
      timeout_ms: 8000,
      priority: 40,
      required_inputs: ['release', 'artist', 'mission', 'metadata', 'priority', 'context'],
      expected_outputs: ['emails_sent', 'opens', 'clicks', 'replies', 'bounce_rate'],
      metadata: { template: 'datiam-press-outreach-v1', mission_type: 'outreach' },
    },
    {
      name: 'analytics_refresh',
      description: 'Analytics Intelligence — collects cross-platform streaming/engagement metrics and compares to the prior snapshot',
      event_triggers: ['release.intel.mission.analytics.dispatched'],
      webhook_path: '/webhook/analytics-refresh',
      timeout_ms: 8000,
      priority: 30,
      required_inputs: ['release', 'artist', 'mission', 'metadata', 'priority', 'context'],
      expected_outputs: ['spotify_streams', 'apple_streams', 'youtube', 'tiktok', 'instagram', 'followers', 'playlist_additions', 'save_rate', 'listener_growth'],
      metadata: { template: 'datiam-analytics-refresh-v1', mission_type: 'analytics' },
    },
  ];

  for (const wfDef of missionWorkflows) {
    const exists = await db
      .select({ id: workflow_registry.id })
      .from(workflow_registry)
      .where(eq(workflow_registry.name, wfDef.name))
      .limit(1);

    if (!exists.length) {
      const [wf] = await db
        .insert(workflow_registry)
        .values({ ...wfDef, is_active: true, version: 'v1' })
        .returning();
      seeded.push(wf);

      logActivity({
        eventType: 'workflow.registered',
        module: 'automation',
        entityType: 'workflow_registry',
        entityId: wf.id,
        title: `Workflow seeded: ${wfDef.name}`,
        severity: 'info',
        metadata: { seeded: true, mission_type: wfDef.metadata.mission_type },
      });
    }
  }

  // ── Music Links Hub + dedicated outreach-segment workflows ───────────────

  const artistIntelWorkflows: Array<{
    name: string;
    description: string;
    event_triggers: string[];
    webhook_path: string;
    metadata: Record<string, unknown>;
  }> = [
    {
      name: 'music-links-events',
      description: 'Fires when an artist/release URL is added, updated, or removed via the Music Links Hub',
      event_triggers: ['music_links.created', 'music_links.updated', 'music_links.deleted'],
      webhook_path: '/webhook/music-links',
      metadata: { template: 'datiam-music-links-events-v1' },
    },
    // TODO(roadmap): dj-outreach and blog-outreach are registered here so the
    // dispatch endpoints and DLQ tracking work end-to-end, but no n8n workflow
    // has been built for either yet — no n8n/workflows/*.template.json exists
    // for them, unlike every other entry in this file. Dispatching either
    // fails with HTTP 404 until a real workflow is authored (follow the
    // press-outreach.template.json / playlist-pitch.template.json pattern)
    // and imported/activated on the n8n instance. Deferred as a standalone
    // follow-up; not a blocker for this release.
    {
      name: 'dj-outreach',
      description: 'Automated DJ outreach — discovers and contacts DJs/curators for a release',
      event_triggers: ['automation.dj_outreach.requested'],
      webhook_path: '/webhook/dj-outreach',
      metadata: { template: 'datiam-dj-outreach-v1' },
    },
    {
      name: 'blog-outreach',
      description: 'Automated blog/press outreach — discovers and contacts music blogs for a release',
      event_triggers: ['automation.blog_outreach.requested'],
      webhook_path: '/webhook/blog-outreach',
      metadata: { template: 'datiam-blog-outreach-v1' },
    },
  ];

  for (const wfDef of artistIntelWorkflows) {
    const exists = await db
      .select({ id: workflow_registry.id })
      .from(workflow_registry)
      .where(eq(workflow_registry.name, wfDef.name))
      .limit(1);

    if (!exists.length) {
      const [wf] = await db
        .insert(workflow_registry)
        .values({ ...wfDef, is_active: true })
        .returning();
      seeded.push(wf);

      logActivity({
        eventType: 'workflow.registered',
        module: 'automation',
        entityType: 'workflow_registry',
        entityId: wf.id,
        title: `Workflow seeded: ${wfDef.name}`,
        severity: 'info',
        metadata: { seeded: true },
      });
    }
  }

  // ── Append manual-dispatch event triggers to existing mission workflows ──
  // (playlist pitching / sync pitching / social scheduling / analytics updates
  // manual dispatch from Artist/Release Intelligence share these workflows
  // with the release-intel mission dispatcher, distinguished by event name.)

  await ensureEventTrigger('playlist_pitch',    'automation.playlist_pitch.requested');
  await ensureEventTrigger('sync_pitch',         'automation.sync_pitch.requested');
  await ensureEventTrigger('content_calendar',   'automation.social_scheduling.requested');
  await ensureEventTrigger('analytics_refresh',  'automation.analytics_updates.requested');

  return {
    seeded: seeded.length,
    message: seeded.length > 0
      ? `Seeded ${seeded.length} workflow(s)`
      : 'All workflows already registered',
    workflows: seeded,
  };
};

// Idempotently appends `event` to an existing workflow_registry row's
// event_triggers array, if it's not already present. No-op if the workflow
// doesn't exist yet (seedWorkflows always seeds it first in the same call).
const ensureEventTrigger = async (workflowName: string, event: string) => {
  await db.execute(sql`
    UPDATE workflow_registry
    SET event_triggers = array_append(event_triggers, ${event})
    WHERE name = ${workflowName} AND NOT (event_triggers @> ARRAY[${event}]::text[])
  `);
};

// ── Test Event Dispatch ──────────────────────────────────────────────────────

export const testEventDispatch = async (event: string, data: Record<string, unknown> = {}) => {
  const result = await dispatchEvent(event, {
    ...data,
    _test: true,
    _timestamp: new Date().toISOString(),
  });
  return result;
};

// ── Deployment Report ────────────────────────────────────────────────────────

export const getDeploymentReport = async () => {
  const [n8nHealth, stats, dlq, workflows] = await Promise.all([
    checkN8nHealth(),
    getAutomationStats(),
    getDeadLetterQueue(),
    listWorkflows(),
  ]);

  const allEvents = [
    'artist.created', 'artist.updated',
    'song.created', 'song.updated',
    'catalog.release.created', 'catalog.release.updated',
    'asset.uploaded', 'credit.updated', 'document.uploaded',
    'release.created', 'release.updated', 'release.published',
    'release.campaign.started', 'release.campaign.completed',
  ];

  const todos: string[] = [];
  if (!N8N_BASE_URL)  todos.push('Set N8N_WEBHOOK_BASE_URL environment variable');
  if (!N8N_SECRET)    todos.push('Set N8N_WEBHOOK_SECRET environment variable');
  if (dlq.total > 0)  todos.push(`${dlq.total} dead-lettered run(s) require attention`);
  if (!workflows.length) todos.push('Seed workflows via POST /automation/seed');
  if (n8nHealth.status !== 'healthy') todos.push(`n8n instance is ${n8nHealth.status} — start with: docker compose -f n8n/docker-compose.n8n.yml up -d`);

  return {
    generated_at: new Date().toISOString(),
    n8n: {
      status: n8nHealth.status,
      base_url: N8N_BASE_URL || 'NOT_CONFIGURED',
      webhook_secret_configured: !!N8N_SECRET,
    },
    workflows: {
      total: workflows.length,
      active: workflows.filter(w => w.is_active).length,
      inactive: workflows.filter(w => !w.is_active).length,
      registered: workflows.map(w => ({
        name: w.name,
        webhook_path: w.webhook_path,
        event_triggers: w.event_triggers,
        is_active: w.is_active,
        total_runs: w.total_runs,
        success_count: w.success_count,
        failed_count: w.failed_count,
        last_run_at: w.last_run_at,
        last_run_status: w.last_run_status,
      })),
    },
    execution: {
      total_runs:    stats.overview.totalRuns,
      success_count: stats.overview.successCount,
      failed_count:  stats.overview.failedCount,
      success_rate:  stats.overview.successRate,
      queue_health:  stats.overview.queueHealth,
    },
    dead_letter_queue: {
      total:    dlq.total,
      oldest_at: dlq.runs[dlq.runs.length - 1]?.created_at ?? null,
    },
    environment: {
      N8N_WEBHOOK_BASE_URL: N8N_BASE_URL ? 'SET' : 'NOT_SET',
      N8N_WEBHOOK_SECRET:   N8N_SECRET   ? 'SET' : 'NOT_SET',
    },
    registered_events: allEvents,
    retry_config: {
      max_retries:      3,
      backoff_strategy: 'linear (1s × attempt)',
      timeout_ms:       TRIGGER_TIMEOUT,
    },
    webhook_urls: workflows.map(w => ({
      workflow:    w.name,
      webhook_url: N8N_BASE_URL ? `${N8N_BASE_URL}${w.webhook_path}` : `<N8N_WEBHOOK_BASE_URL>${w.webhook_path}`,
    })),
    todos,
  };
};

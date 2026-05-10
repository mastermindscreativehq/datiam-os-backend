import { eq, ne, count, desc, sql, and } from 'drizzle-orm';
import { db } from '../../db';
import { releases, release_tasks } from '../../db/schema';
import { AppError } from '../../middleware/errorHandler';

export const getPipelineOverview = async () => {
  const today = new Date().toISOString().split('T')[0];

  const [statusBreakdown, overdueTasks, tasksByCategory] = await Promise.all([
    db
      .select({ status: releases.status, count: count() })
      .from(releases)
      .groupBy(releases.status),
    db
      .select()
      .from(release_tasks)
      .where(
        and(
          ne(release_tasks.status, 'done'),
          sql`${release_tasks.due_date} IS NOT NULL`,
          sql`${release_tasks.due_date} < ${today}`,
        ),
      )
      .orderBy(release_tasks.due_date)
      .limit(20),
    db
      .select({
        task_category: release_tasks.task_category,
        status: release_tasks.status,
        count: count(),
      })
      .from(release_tasks)
      .groupBy(release_tasks.task_category, release_tasks.status),
  ]);

  return { status_breakdown: statusBreakdown, overdue_tasks: overdueTasks, tasks_by_category: tasksByCategory };
};

export const getReleaseReadiness = async (releaseId: string) => {
  const [release] = await db
    .select()
    .from(releases)
    .where(eq(releases.id, releaseId))
    .limit(1);
  if (!release) throw new AppError('Release not found', 404);

  const tasks = await db
    .select()
    .from(release_tasks)
    .where(eq(release_tasks.release_id, releaseId));

  const total = tasks.length;
  const done = tasks.filter((t) => t.status === 'done').length;
  const blocked = tasks.filter((t) => t.status === 'blocked').length;
  const readiness_score = total > 0 ? Math.round((done / total) * 100) : 0;

  const byCategory: Record<string, { done: number; total: number; pct: number }> = {};
  for (const t of tasks) {
    if (!byCategory[t.task_category]) byCategory[t.task_category] = { done: 0, total: 0, pct: 0 };
    byCategory[t.task_category].total++;
    if (t.status === 'done') byCategory[t.task_category].done++;
  }
  for (const cat of Object.values(byCategory)) {
    cat.pct = cat.total > 0 ? Math.round((cat.done / cat.total) * 100) : 0;
  }

  return {
    release,
    readiness_score,
    tasks_total: total,
    tasks_done: done,
    tasks_pending: total - done,
    tasks_blocked: blocked,
    by_category: byCategory,
    tasks,
  };
};

export const getUpcomingTimeline = async (days = 90) => {
  const today = new Date().toISOString().split('T')[0];
  const future = new Date();
  future.setDate(future.getDate() + days);
  const futureDate = future.toISOString().split('T')[0];

  return db
    .select()
    .from(releases)
    .where(
      and(
        ne(releases.status, 'live'),
        sql`${releases.release_date} IS NOT NULL`,
        sql`${releases.release_date} >= ${today}`,
        sql`${releases.release_date} <= ${futureDate}`,
      ),
    )
    .orderBy(releases.release_date);
};

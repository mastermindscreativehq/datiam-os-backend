import { desc, isNotNull, sql } from 'drizzle-orm';
import { db } from '../../db';
import { activity_log } from '../../db/schema';
import { logActivity as libLogActivity } from '../../lib/activityLogger';

// Backwards-compat wrapper — old-style callers in catalog, sync, fans, etc.
export interface LegacyLogInput {
  userId?: string;
  userEmail?: string;
  action: string;
  entityType: string;
  entityId?: string;
  entityName?: string;
}

export const logActivity = (input: LegacyLogInput): void => {
  libLogActivity({
    userId: input.userId,
    eventType: input.action.toLowerCase(),
    module: input.entityType,
    entityType: input.entityType,
    entityId: input.entityId,
    title: input.entityName
      ? `${input.action}: ${input.entityName}`
      : `${input.action} on ${input.entityType}`,
    severity: input.action === 'DELETE' ? 'warning' : 'info',
  });
};

export const getRecentActivity = async (limit = 50) => {
  return db
    .select()
    .from(activity_log)
    .orderBy(desc(activity_log.created_at))
    .limit(limit);
};

export const getActivityStats = async () => {
  const [bySeverity, byModule, byEventType] = await Promise.all([
    db
      .select({ severity: activity_log.severity, count: sql<number>`count(*)::int` })
      .from(activity_log)
      .groupBy(activity_log.severity),
    db
      .select({ module: activity_log.module, count: sql<number>`count(*)::int` })
      .from(activity_log)
      .where(isNotNull(activity_log.module))
      .groupBy(activity_log.module),
    db
      .select({ event_type: activity_log.event_type, count: sql<number>`count(*)::int` })
      .from(activity_log)
      .where(isNotNull(activity_log.event_type))
      .groupBy(activity_log.event_type),
  ]);
  return { bySeverity, byModule, byEventType };
};

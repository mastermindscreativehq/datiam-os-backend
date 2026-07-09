import { and, desc, eq, isNotNull, sql } from 'drizzle-orm';
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

export interface RecentActivityFilters {
  entityType?: string;
  entityId?: string;
  limit?: number;
}

export const getRecentActivity = async (filters: RecentActivityFilters = {}) => {
  const { entityType, entityId, limit = 50 } = filters;
  try {
    const conditions = [];
    if (entityType) conditions.push(eq(activity_log.entity_type, entityType));
    if (entityId) conditions.push(eq(activity_log.entity_id, entityId));

    return await db
      .select({
        id:          activity_log.id,
        user_id:     activity_log.user_id,
        user_email:  activity_log.user_email,
        user_name:   activity_log.user_name,
        action:      activity_log.action,
        entity_type: activity_log.entity_type,
        entity_id:   activity_log.entity_id,
        entity_name: activity_log.entity_name,
        event_type:  activity_log.event_type,
        module:      activity_log.module,
        title:       activity_log.title,
        description: activity_log.description,
        severity:    activity_log.severity,
        metadata:    activity_log.metadata,
        created_at:  activity_log.created_at,
      })
      .from(activity_log)
      .where(conditions.length ? and(...conditions) : undefined)
      .orderBy(desc(activity_log.created_at))
      .limit(limit);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(JSON.stringify({
      event: 'activity_recent_query_failed',
      error: message,
    }));
    // Surface the real SQL error so callers/logs can diagnose schema drift
    throw Object.assign(new Error(`activity_log query failed: ${message}`), { cause: err });
  }
};

export const getActivityStats = async () => {
  try {
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
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(JSON.stringify({
      event: 'activity_stats_query_failed',
      error: message,
    }));
    // Return empty stats instead of a 500 — schema may be pending migration
    return {
      bySeverity: [] as { severity: string; count: number }[],
      byModule: [] as { module: string; count: number }[],
      byEventType: [] as { event_type: string; count: number }[],
      _error: message,
    };
  }
};

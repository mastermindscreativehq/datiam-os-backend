import { db } from '../db';
import { activity_log } from '../db/schema';

export type Severity = 'info' | 'warning' | 'error' | 'critical';

export interface LogActivityInput {
  userId?: string;
  userEmail?: string;
  userName?: string;
  eventType: string;
  module: string;
  entityType?: string;
  entityId?: string;
  title: string;
  description?: string;
  severity?: Severity;
  metadata?: Record<string, unknown>;
  requestId?: string;
}

export const logActivity = (input: LogActivityInput): void => {
  const safeMetadata = (() => {
    try {
      const base = input.metadata ? (JSON.parse(JSON.stringify(input.metadata)) as Record<string, unknown>) : {};
      if (input.requestId) base.requestId = input.requestId;
      return base;
    } catch {
      return input.requestId ? { requestId: input.requestId } : {};
    }
  })();

  db.insert(activity_log)
    .values({
      // user_id omitted: the FK on activity_log.user_id → users.id causes a
      // silent constraint violation when the UUID isn't present in users (e.g.
      // DB reset, stale JWT). user_email is the reliable audit identifier.
      user_email: input.userEmail,
      user_name: input.userName,
      event_type: input.eventType,
      module: input.module,
      entity_type: input.entityType ?? input.module,
      entity_id: input.entityId,
      title: input.title,
      description: input.description,
      severity: input.severity ?? 'info',
      metadata: safeMetadata,
    })
    .catch((err) => {
      console.error('[ActivityLogger]', JSON.stringify({
        event: 'activity_log_write_error',
        eventType: input.eventType,
        module: input.module,
        error: err instanceof Error ? err.message : String(err),
      }));
    });
};

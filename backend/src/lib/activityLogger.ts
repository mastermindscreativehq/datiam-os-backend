import { db } from '../db';
import { activity_log } from '../db/schema';

export type Severity = 'info' | 'warning' | 'error' | 'critical';

export interface LogActivityInput {
  userId?: string;
  eventType: string;
  module: string;
  entityType?: string;
  entityId?: string;
  title: string;
  description?: string;
  severity?: Severity;
  metadata?: Record<string, unknown>;
}

export const logActivity = (input: LogActivityInput): void => {
  const safeMetadata = (() => {
    try {
      return input.metadata ? (JSON.parse(JSON.stringify(input.metadata)) as Record<string, unknown>) : {};
    } catch {
      return {};
    }
  })();

  db.insert(activity_log)
    .values({
      user_id: input.userId,
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

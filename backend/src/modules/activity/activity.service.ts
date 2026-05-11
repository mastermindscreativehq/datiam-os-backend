import { desc } from 'drizzle-orm';
import { db } from '../../db';
import { activity_log } from '../../db/schema';

export interface LogInput {
  userId?: string;
  userEmail: string;
  userName?: string;
  action: 'CREATE' | 'UPDATE' | 'DELETE' | 'LOGIN';
  entityType: string;
  entityId?: string;
  entityName?: string;
}

export const logActivity = async (input: LogInput): Promise<void> => {
  try {
    await db.insert(activity_log).values({
      user_id: input.userId,
      user_email: input.userEmail,
      user_name: input.userName,
      action: input.action,
      entity_type: input.entityType,
      entity_id: input.entityId,
      entity_name: input.entityName,
    });
  } catch {
    // Non-blocking — never let audit failures break the main operation
  }
};

export const getRecentActivity = async (limit = 30) => {
  return db
    .select()
    .from(activity_log)
    .orderBy(desc(activity_log.created_at))
    .limit(limit);
};

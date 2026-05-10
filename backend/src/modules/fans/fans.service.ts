import { eq } from 'drizzle-orm';
import { db } from '../../db';
import { fan_profiles, fan_events } from '../../db/schema';
import { AppError } from '../../middleware/errorHandler';
import type { CreateFanInput, CreateFanEventInput } from './fans.schema';

export const createFan = async (input: CreateFanInput) => {
  const [fan] = await db.insert(fan_profiles).values(input).returning();
  return fan;
};

export const getFans = async () => {
  return db.select().from(fan_profiles).orderBy(fan_profiles.created_at);
};

export const getFanById = async (id: string) => {
  const [fan] = await db.select().from(fan_profiles).where(eq(fan_profiles.id, id)).limit(1);
  if (!fan) throw new AppError('Fan not found', 404);
  return fan;
};

export const createFanEvent = async (fanId: string, input: CreateFanEventInput) => {
  const fan = await getFanById(fanId);
  if (!fan) throw new AppError('Fan not found', 404);

  const [event] = await db
    .insert(fan_events)
    .values({
      fan_id: fanId,
      event_type: input.event_type,
      platform: input.platform,
      metadata: input.metadata ?? null,
    })
    .returning();
  return event;
};

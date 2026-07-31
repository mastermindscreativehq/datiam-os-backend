import { eq, sql } from 'drizzle-orm';
import { db } from '../../db';
import { fan_profiles, fan_events } from '../../db/schema';
import { AppError } from '../../middleware/errorHandler';
import type { CreateFanInput, CreateFanEventInput } from './fans.schema';

export const updateFan = async (id: string, input: Partial<CreateFanInput>) => {
  const [updated] = await db
    .update(fan_profiles)
    .set({ ...input, updated_at: new Date() })
    .where(eq(fan_profiles.id, id))
    .returning();
  if (!updated) throw new AppError('Fan not found', 404);
  return updated;
};

export const deleteFan = async (id: string) => {
  const [deleted] = await db.delete(fan_profiles).where(eq(fan_profiles.id, id)).returning();
  if (!deleted) throw new AppError('Fan not found', 404);
  return { deleted: true, id };
};

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

// fan-intelligence's derived scores (superfan/ambassador/community/DSP
// listener count) live as columns on fan_profiles, so fans/ stays the sole
// writer even for intelligence-computed values — fan-intelligence calls
// these instead of updating fan_profiles directly.

export const updateFanScores = async (
  id: string,
  patch: Partial<{
    superfan_score: number;
    ambassador_score: number;
    dsp_listener_count: number;
    community_score: number;
  }>,
) => {
  const set: Record<string, unknown> = { updated_at: new Date() };
  if (patch.superfan_score !== undefined) set.superfan_score = patch.superfan_score;
  if (patch.ambassador_score !== undefined) set.ambassador_score = patch.ambassador_score.toString();
  if (patch.dsp_listener_count !== undefined) set.dsp_listener_count = patch.dsp_listener_count;
  if (patch.community_score !== undefined) set.community_score = patch.community_score.toString();

  const [updated] = await db.update(fan_profiles).set(set).where(eq(fan_profiles.id, id)).returning();
  if (!updated) throw new AppError('Fan not found', 404);
  return updated;
};

export const incrementFanReferralCount = async (id: string) => {
  const [updated] = await db
    .update(fan_profiles)
    .set({ referral_count: sql`${fan_profiles.referral_count} + 1` })
    .where(eq(fan_profiles.id, id))
    .returning();
  if (!updated) throw new AppError('Fan not found', 404);
  return updated;
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

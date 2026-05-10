import { eq } from 'drizzle-orm';
import { db } from '../../db';
import { sync_pitches } from '../../db/schema';
import { AppError } from '../../middleware/errorHandler';
import type { CreateSyncPitchInput, UpdateSyncPitchInput } from './sync.schema';

export const createSyncPitch = async (input: CreateSyncPitchInput) => {
  const [pitch] = await db.insert(sync_pitches).values(input).returning();
  return pitch;
};

export const getSyncPitches = async () => {
  return db.select().from(sync_pitches).orderBy(sync_pitches.created_at);
};

export const updateSyncPitch = async (id: string, input: UpdateSyncPitchInput) => {
  const [updated] = await db
    .update(sync_pitches)
    .set(input)
    .where(eq(sync_pitches.id, id))
    .returning();
  if (!updated) throw new AppError('Sync pitch not found', 404);
  return updated;
};

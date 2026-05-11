import { eq } from 'drizzle-orm';
import { db } from '../../db';
import { artist_profiles } from '../../db/schema';
import { AppError } from '../../middleware/errorHandler';
import type { CreateArtistInput, UpdateArtistInput } from './artists.schema';

export const listArtists = async () => {
  return db.select().from(artist_profiles).orderBy(artist_profiles.created_at);
};

export const createProfile = async (input: CreateArtistInput) => {
  const [profile] = await db.insert(artist_profiles).values(input).returning();
  return profile;
};

export const updateProfile = async (id: string, input: UpdateArtistInput) => {
  const [updated] = await db
    .update(artist_profiles)
    .set({ ...input, updated_at: new Date() })
    .where(eq(artist_profiles.id, id))
    .returning();
  if (!updated) throw new AppError('Artist profile not found', 404);
  return updated;
};

export const deleteProfile = async (id: string) => {
  const [deleted] = await db
    .delete(artist_profiles)
    .where(eq(artist_profiles.id, id))
    .returning();
  if (!deleted) throw new AppError('Artist profile not found', 404);
  return deleted;
};

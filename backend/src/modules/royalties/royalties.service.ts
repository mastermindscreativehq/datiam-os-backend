import { eq } from 'drizzle-orm';
import { db } from '../../db';
import { royalty_sources } from '../../db/schema';
import type { CreateRoyaltyInput } from './royalties.schema';

export const createRoyalty = async (input: CreateRoyaltyInput) => {
  const [royalty] = await db
    .insert(royalty_sources)
    .values({
      ...input,
      amount: input.amount.toString(),
    })
    .returning();
  return royalty;
};

export const getRoyalties = async () => {
  return db.select().from(royalty_sources).orderBy(royalty_sources.imported_at);
};

export const getRoyaltiesBySong = async (songId: string) => {
  return db
    .select()
    .from(royalty_sources)
    .where(eq(royalty_sources.song_id, songId))
    .orderBy(royalty_sources.imported_at);
};

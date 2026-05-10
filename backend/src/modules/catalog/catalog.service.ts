import { eq } from 'drizzle-orm';
import { db } from '../../db';
import { songs, song_assets, contributors } from '../../db/schema';
import { AppError } from '../../middleware/errorHandler';
import type {
  CreateSongInput,
  UpdateSongInput,
  CreateAssetInput,
  CreateContributorInput,
} from './catalog.schema';

export const createSong = async (input: CreateSongInput) => {
  const [song] = await db.insert(songs).values(input).returning();
  return song;
};

export const getSongs = async () => {
  return db.select().from(songs).orderBy(songs.created_at);
};

export const getSongById = async (id: string) => {
  const [song] = await db.select().from(songs).where(eq(songs.id, id)).limit(1);
  if (!song) throw new AppError('Song not found', 404);
  return song;
};

export const updateSong = async (id: string, input: UpdateSongInput) => {
  const [updated] = await db
    .update(songs)
    .set({ ...input, updated_at: new Date() })
    .where(eq(songs.id, id))
    .returning();
  if (!updated) throw new AppError('Song not found', 404);
  return updated;
};

export const deleteSong = async (id: string) => {
  const [deleted] = await db.delete(songs).where(eq(songs.id, id)).returning();
  if (!deleted) throw new AppError('Song not found', 404);
  return { deleted: true, id };
};

export const createAsset = async (songId: string, input: CreateAssetInput) => {
  const [asset] = await db
    .insert(song_assets)
    .values({ song_id: songId, ...input })
    .returning();
  return asset;
};

export const getAssets = async (songId: string) => {
  return db.select().from(song_assets).where(eq(song_assets.song_id, songId));
};

export const createContributor = async (songId: string, input: CreateContributorInput) => {
  const toInsert = {
    song_id: songId,
    name: input.name,
    role: input.role,
    ownership_percentage: input.ownership_percentage?.toString(),
    publishing_percentage: input.publishing_percentage?.toString(),
    master_percentage: input.master_percentage?.toString(),
    pro_affiliation: input.pro_affiliation,
    ipi_number: input.ipi_number,
  };
  const [contributor] = await db.insert(contributors).values(toInsert).returning();
  return contributor;
};

export const getContributors = async (songId: string) => {
  return db.select().from(contributors).where(eq(contributors.song_id, songId));
};

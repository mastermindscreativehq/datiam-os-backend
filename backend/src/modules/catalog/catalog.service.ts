import { eq, desc, and, type SQL } from 'drizzle-orm';
import { db } from '../../db';
import { songs, song_assets, contributors } from '../../db/schema';
import { AppError } from '../../middleware/errorHandler';
import type {
  CreateSongInput,
  UpdateSongInput,
  CreateAssetInput,
  CreateContributorInput,
} from './catalog.schema';

const slugify = (str: string) =>
  str.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

// Maps DB row → Music Core v1 API shape
function mapSong(s: typeof songs.$inferSelect) {
  return {
    ...s,
    status: s.release_status,
    // Expose musical_key (new column); fall back to legacy `key` if not yet set
    musical_key: s.musical_key ?? s.key,
  };
}

export type MappedSong = ReturnType<typeof mapSong>;

export const createSong = async (input: CreateSongInput): Promise<MappedSong> => {
  const {
    status,
    musical_key,
    slug,
    energy_score,
    emotion_score,
    viral_score,
    commercial_score,
    spiritual_score,
    ...rest
  } = input;

  const [song] = await db
    .insert(songs)
    .values({
      ...rest,
      release_status: status ?? 'draft',
      musical_key,
      slug: slug ?? slugify(input.title),
      energy_score: energy_score != null ? String(energy_score) : undefined,
      emotion_score: emotion_score != null ? String(emotion_score) : undefined,
      viral_score: viral_score != null ? String(viral_score) : undefined,
      commercial_score: commercial_score != null ? String(commercial_score) : undefined,
      spiritual_score: spiritual_score != null ? String(spiritual_score) : undefined,
    })
    .returning();

  return mapSong(song);
};

export interface SongFilters {
  artist_id?: string;
  release_id?: string;
  status?: string;
  genre?: string;
  explicit?: boolean;
}

export const getSongs = async (filters: SongFilters = {}): Promise<MappedSong[]> => {
  const conditions: SQL<unknown>[] = [];
  if (filters.artist_id) conditions.push(eq(songs.artist_id, filters.artist_id));
  if (filters.release_id) conditions.push(eq(songs.release_id, filters.release_id));
  if (filters.genre) conditions.push(eq(songs.genre, filters.genre));
  if (filters.explicit !== undefined) conditions.push(eq(songs.explicit, filters.explicit));
  if (filters.status) {
    conditions.push(
      eq(
        songs.release_status,
        filters.status as 'draft' | 'registered' | 'distributed' | 'released' | 'archived',
      ),
    );
  }

  const rows = await db
    .select()
    .from(songs)
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(desc(songs.created_at));

  return rows.map(mapSong);
};

export const getSongById = async (id: string): Promise<MappedSong> => {
  const [song] = await db.select().from(songs).where(eq(songs.id, id)).limit(1);
  if (!song) throw new AppError('Song not found', 404);
  return mapSong(song);
};

export const updateSong = async (id: string, input: UpdateSongInput): Promise<MappedSong> => {
  const {
    status,
    musical_key,
    slug,
    energy_score,
    emotion_score,
    viral_score,
    commercial_score,
    spiritual_score,
    ...rest
  } = input;

  const patch: Record<string, unknown> = { ...rest, updated_at: new Date() };
  if (status !== undefined) patch.release_status = status;
  if (musical_key !== undefined) patch.musical_key = musical_key;
  if (slug !== undefined) patch.slug = slug;
  else if (input.title !== undefined) patch.slug = slugify(input.title);
  if (energy_score !== undefined) patch.energy_score = String(energy_score);
  if (emotion_score !== undefined) patch.emotion_score = String(emotion_score);
  if (viral_score !== undefined) patch.viral_score = String(viral_score);
  if (commercial_score !== undefined) patch.commercial_score = String(commercial_score);
  if (spiritual_score !== undefined) patch.spiritual_score = String(spiritual_score);

  const [updated] = await db
    .update(songs)
    .set(patch)
    .where(eq(songs.id, id))
    .returning();
  if (!updated) throw new AppError('Song not found', 404);
  return mapSong(updated);
};

export const deleteSong = async (id: string): Promise<{ deleted: boolean; id: string }> => {
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
  const [contributor] = await db
    .insert(contributors)
    .values({
      song_id: songId,
      name: input.name,
      role: input.role,
      ownership_percentage: input.ownership_percentage != null
        ? String(input.ownership_percentage)
        : undefined,
      publishing_percentage: input.publishing_percentage != null
        ? String(input.publishing_percentage)
        : undefined,
      master_percentage: input.master_percentage != null
        ? String(input.master_percentage)
        : undefined,
      pro_affiliation: input.pro_affiliation,
      ipi_number: input.ipi_number,
    })
    .returning();
  return contributor;
};

export const getContributors = async (songId: string) => {
  return db.select().from(contributors).where(eq(contributors.song_id, songId));
};

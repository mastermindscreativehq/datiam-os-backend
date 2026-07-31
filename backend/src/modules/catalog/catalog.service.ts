import { eq } from 'drizzle-orm';
import { db } from '../../db';
import { songs, song_assets, contributors } from '../../db/schema';
import {
  createSongCore,
  updateSongCore,
  deleteSongCore,
  getSongs as getCatalogSongs,
  getSongById as getCatalogSongById,
} from '../catalog-engine/songs.service';
import type {
  CreateSongInput,
  UpdateSongInput,
  CreateAssetInput,
  CreateContributorInput,
} from './catalog.schema';

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

// Legacy `/api/songs` writes now delegate to catalog-engine's shared write
// core (see songs.service.ts) instead of running an independent INSERT/UPDATE
// against `songs` — this was the source of divergent writes between the
// legacy and v2 catalog APIs (legacy never set writers/producers/tags; v2
// never set release_id or the AI intelligence scores). Only the field
// mapping (`status` <-> `release_status`, numeric scores <-> decimal
// strings) and response shape stay specific to this legacy surface.

export const createSong = async (input: CreateSongInput): Promise<MappedSong> => {
  const {
    status,
    energy_score,
    emotion_score,
    viral_score,
    commercial_score,
    spiritual_score,
    ...rest
  } = input;

  const song = await createSongCore({
    ...rest,
    release_status: status ?? 'draft',
    energy_score: energy_score != null ? String(energy_score) : undefined,
    emotion_score: emotion_score != null ? String(emotion_score) : undefined,
    viral_score: viral_score != null ? String(viral_score) : undefined,
    commercial_score: commercial_score != null ? String(commercial_score) : undefined,
    spiritual_score: spiritual_score != null ? String(spiritual_score) : undefined,
  });

  return mapSong(song as typeof songs.$inferSelect);
};

export interface SongFilters {
  artist_id?: string;
  release_id?: string;
  status?: string;
  genre?: string;
  explicit?: boolean;
}

// Both read functions now delegate to catalog-engine's canonical query
// implementation instead of running a second, independent `songs` query —
// this module previously had its own drizzle select here that had silently
// drifted from catalog-engine's (missing writers/producers/tags/artist_name,
// credits/identifiers/assets). `release_id`/`explicit` aren't supported by
// catalog-engine's query params, so they're applied as a post-filter here;
// pagination is walked to completion since this legacy endpoint's contract
// returns every matching row, not a page.

export const getSongs = async (filters: SongFilters = {}): Promise<MappedSong[]> => {
  const rows: Record<string, unknown>[] = [];
  let page = 1;
  const limit = 100;

  while (true) {
    const { data, pagination } = await getCatalogSongs({
      page,
      limit,
      sort: 'created_at',
      order: 'desc',
      artist_id: filters.artist_id,
      status: filters.status,
      genre: filters.genre,
    });
    rows.push(...(data as Record<string, unknown>[]));
    if (data.length < limit || page >= pagination.pages) break;
    page++;
  }

  const filtered = rows.filter((r) =>
    (filters.release_id === undefined || r.release_id === filters.release_id) &&
    (filters.explicit === undefined || r.explicit === filters.explicit),
  );

  return filtered.map((r) => mapSong(r as typeof songs.$inferSelect));
};

export const getSongById = async (id: string): Promise<MappedSong> => {
  const song = await getCatalogSongById(id);
  return mapSong(song as unknown as typeof songs.$inferSelect);
};

export const updateSong = async (id: string, input: UpdateSongInput): Promise<MappedSong> => {
  const {
    status,
    energy_score,
    emotion_score,
    viral_score,
    commercial_score,
    spiritual_score,
    ...rest
  } = input;

  const patch: Record<string, unknown> = { ...rest };
  if (status !== undefined) patch.release_status = status;
  if (energy_score !== undefined) patch.energy_score = String(energy_score);
  if (emotion_score !== undefined) patch.emotion_score = String(emotion_score);
  if (viral_score !== undefined) patch.viral_score = String(viral_score);
  if (commercial_score !== undefined) patch.commercial_score = String(commercial_score);
  if (spiritual_score !== undefined) patch.spiritual_score = String(spiritual_score);

  const updated = await updateSongCore(id, patch);
  return mapSong(updated as typeof songs.$inferSelect);
};

export const deleteSong = async (id: string): Promise<{ deleted: boolean; id: string }> => {
  const result = await deleteSongCore(id);
  return { deleted: result.deleted, id: result.id };
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

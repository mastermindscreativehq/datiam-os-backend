import { eq, desc, asc, sql, count, and, ilike } from 'drizzle-orm';
import { db } from '../../db';
import {
  releases,
  artist_profiles,
  songs,
  catalog_tracks,
  catalog_artwork_assets,
  catalog_identifiers,
  release_checklists,
} from '../../db/schema';
import { AppError } from '../../middleware/errorHandler';
import { dispatchEvent } from '../automation/automation.service';
import { createReleaseCore, updateReleaseCore, deleteReleaseCore, type ReleaseCoreWriteInput } from '../releases/releases.service';
import type {
  CreateReleaseInputV2,
  UpdateReleaseInputV2,
  CreateTrackInput,
  CreateArtworkInput,
  CreateIdentifierInput,
  CatalogQuery,
} from './catalog-engine.schema';

// ── createRelease ─────────────────────────────────────────────────────────────

export const createRelease = async (input: CreateReleaseInputV2) => {
  const { title, catalog_release_type, preorder_date, ...rest } = input;

  const coreInput: ReleaseCoreWriteInput = {
    ...rest,
    release_title: title,
    release_type: 'single', // required enum field; catalog_release_type is the real text-column type indicator
    catalog_release_type: catalog_release_type ?? 'single',
  };
  if (preorder_date !== undefined) coreInput.preorder_date = preorder_date;

  const release = await createReleaseCore(coreInput);

  dispatchEvent('catalog.release.created', { release_id: release.id, title }).catch(() => {});

  return getReleaseById(release.id);
};

// ── getReleases ───────────────────────────────────────────────────────────────

export const getReleases = async (query: CatalogQuery) => {
  const page  = query.page  ?? 1;
  const limit = query.limit ?? 20;
  const order = query.order ?? 'desc';
  const offset = (page - 1) * limit;

  const conditions = [];
  if (query.search)    conditions.push(ilike(releases.release_title, `%${query.search}%`));
  if (query.artist_id) conditions.push(eq(releases.artist_id, query.artist_id));
  if (query.status)    conditions.push(eq(releases.status, query.status as 'planning' | 'submitted' | 'approved' | 'live'));
  if (query.genre)     conditions.push(eq(releases.genre, query.genre));

  const where = conditions.length ? and(...conditions) : undefined;

  const [rows, [{ total }]] = await Promise.all([
    db.execute<Record<string, unknown>>(sql`
      SELECT
        r.*,
        COALESCE(r.catalog_release_type, 'single') AS catalog_release_type,
        r.preorder_date,
        ap.stage_name AS artist_name
      FROM releases r
      LEFT JOIN artist_profiles ap ON ap.id = r.artist_id
      ${where ? sql`WHERE ${where}` : sql``}
      ORDER BY r.created_at ${sql.raw(order === 'asc' ? 'ASC' : 'DESC')}
      LIMIT ${limit} OFFSET ${offset}
    `),
    db.select({ total: count() }).from(releases).where(where),
  ]);

  return {
    data: rows,
    pagination: { page, limit, total: Number(total), pages: Math.ceil(Number(total) / limit) },
  };
};

// ── getReleaseById ────────────────────────────────────────────────────────────

export const getReleaseById = async (id: string) => {
  const [release] = await db.execute<Record<string, unknown>>(sql`
    SELECT
      r.*,
      COALESCE(r.catalog_release_type, 'single') AS catalog_release_type,
      r.preorder_date,
      ap.stage_name AS artist_name
    FROM releases r
    LEFT JOIN artist_profiles ap ON ap.id = r.artist_id
    WHERE r.id = ${id}
    LIMIT 1
  `);

  if (!release) throw new AppError('Release not found', 404);

  const [tracks, artwork, identifiers, checklist] = await Promise.all([
    getReleaseTracks(id),
    getReleaseArtwork(id),
    getReleaseIdentifiers(id),
    db
      .select()
      .from(release_checklists)
      .where(eq(release_checklists.release_id, id))
      .limit(1),
  ]);

  return { ...release, tracks, artwork, identifiers, checklist: checklist[0] ?? null };
};

// ── updateRelease ─────────────────────────────────────────────────────────────

export const updateRelease = async (id: string, input: UpdateReleaseInputV2) => {
  const { title, catalog_release_type, preorder_date, status, ...rest } = input;

  const coreInput: ReleaseCoreWriteInput = { ...rest };
  if (title !== undefined) coreInput.release_title = title;
  if (status !== undefined) coreInput.status = status;
  if (catalog_release_type !== undefined) coreInput.catalog_release_type = catalog_release_type;
  if (preorder_date !== undefined) coreInput.preorder_date = preorder_date;

  await updateReleaseCore(id, coreInput);

  dispatchEvent('catalog.release.updated', { release_id: id }).catch(() => {});

  return getReleaseById(id);
};

// ── deleteRelease ─────────────────────────────────────────────────────────────

export const deleteRelease = async (id: string) => {
  return deleteReleaseCore(id);
};

// ── Release Tracks ────────────────────────────────────────────────────────────

export const getReleaseTracks = async (releaseId: string) => {
  return db.execute<Record<string, unknown>>(sql`
    SELECT
      ct.*,
      s.title,
      s.isrc,
      s.duration_seconds,
      s.release_status,
      s.audio_url,
      COALESCE(s.writers, '{}')   AS writers,
      COALESCE(s.producers, '{}') AS producers
    FROM catalog_tracks ct
    JOIN songs s ON s.id = ct.song_id
    WHERE ct.release_id = ${releaseId}
    ORDER BY ct.track_number ASC
  `);
};

export const addReleaseTrack = async (releaseId: string, input: CreateTrackInput) => {
  const [existingRelease] = await db.select({ id: releases.id }).from(releases).where(eq(releases.id, releaseId)).limit(1);
  if (!existingRelease) throw new AppError('Release not found', 404);

  const [existingSong] = await db.select({ id: songs.id }).from(songs).where(eq(songs.id, input.song_id)).limit(1);
  if (!existingSong) throw new AppError('Song not found', 404);

  const [track] = await db
    .insert(catalog_tracks)
    .values({
      release_id:   releaseId,
      song_id:      input.song_id,
      track_number: input.track_number ?? 1,
      is_single:    input.is_single ?? false,
    })
    .returning();

  return track;
};

export const removeReleaseTrack = async (trackId: string) => {
  const [deleted] = await db
    .delete(catalog_tracks)
    .where(eq(catalog_tracks.id, trackId))
    .returning({ id: catalog_tracks.id });

  if (!deleted) throw new AppError('Track not found', 404);
  return { id: deleted.id, deleted: true };
};

// ── Release Artwork ───────────────────────────────────────────────────────────

export const getReleaseArtwork = async (releaseId: string) => {
  return db
    .select()
    .from(catalog_artwork_assets)
    .where(eq(catalog_artwork_assets.release_id, releaseId))
    .orderBy(desc(catalog_artwork_assets.created_at));
};

export const addReleaseArtwork = async (releaseId: string, input: CreateArtworkInput) => {
  const [existingRelease] = await db.select({ id: releases.id }).from(releases).where(eq(releases.id, releaseId)).limit(1);
  if (!existingRelease) throw new AppError('Release not found', 404);

  const [artwork] = await db
    .insert(catalog_artwork_assets)
    .values({ ...input, release_id: releaseId })
    .returning();

  dispatchEvent('asset.uploaded', { release_id: releaseId, asset_id: artwork.id, artwork_type: input.artwork_type }).catch(() => {});

  return artwork;
};

export const deleteArtwork = async (artworkId: string) => {
  const [deleted] = await db
    .delete(catalog_artwork_assets)
    .where(eq(catalog_artwork_assets.id, artworkId))
    .returning({ id: catalog_artwork_assets.id });

  if (!deleted) throw new AppError('Artwork not found', 404);
  return { id: deleted.id, deleted: true };
};

// ── Release Identifiers ───────────────────────────────────────────────────────

export const getReleaseIdentifiers = async (releaseId: string) => {
  return db
    .select()
    .from(catalog_identifiers)
    .where(eq(catalog_identifiers.release_id, releaseId))
    .orderBy(desc(catalog_identifiers.created_at));
};

export const addReleaseIdentifier = async (releaseId: string, input: CreateIdentifierInput) => {
  const [existingRelease] = await db.select({ id: releases.id }).from(releases).where(eq(releases.id, releaseId)).limit(1);
  if (!existingRelease) throw new AppError('Release not found', 404);

  const [identifier] = await db
    .insert(catalog_identifiers)
    .values({
      release_id:      releaseId,
      identifier_type: input.identifier_type,
      value:           input.value,
      assigned_by:     input.assigned_by,
      assigned_at:     input.assigned_at ? new Date(input.assigned_at) : undefined,
    })
    .returning();

  return identifier;
};

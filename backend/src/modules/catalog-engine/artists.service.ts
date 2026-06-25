import { eq, ilike, and, desc, asc, sql, count } from 'drizzle-orm';
import { db } from '../../db';
import {
  artist_profiles,
  songs,
  releases,
  catalog_identifiers,
  catalog_artwork_assets,
  catalog_credits,
} from '../../db/schema';
import { AppError } from '../../middleware/errorHandler';
import { dispatchEvent } from '../automation/automation.service';
import type { CreateArtistInput, UpdateArtistInput, CatalogQuery } from './catalog-engine.schema';

// ── helpers ──────────────────────────────────────────────────────────────────

function buildOrder(sort: string, order: 'asc' | 'desc') {
  const dir = order === 'asc' ? asc : desc;
  switch (sort) {
    case 'stage_name': return dir(artist_profiles.stage_name);
    case 'updated_at': return dir(artist_profiles.updated_at);
    default:           return dir(artist_profiles.created_at);
  }
}

// ── createArtist ──────────────────────────────────────────────────────────────

export const createArtist = async (input: CreateArtistInput) => {
  const { biography, genres, countries, catalog_status, social_links, ...rest } = input;

  const [artist] = await db
    .insert(artist_profiles)
    .values({
      ...rest,
      bio: biography,
      social_links: social_links ?? null,
    })
    .returning();

  // Set migration-added columns via raw SQL
  if (genres?.length || countries?.length || catalog_status) {
    await db.execute(sql`
      UPDATE artist_profiles
      SET
        genres         = ${JSON.stringify(genres ?? [])}::text[],
        countries      = ${JSON.stringify(countries ?? [])}::text[],
        catalog_status = ${catalog_status ?? 'active'}
      WHERE id = ${artist.id}
    `);
  }

  const full = await getArtistById(artist.id);

  dispatchEvent('artist.created', { artist_id: artist.id, stage_name: artist.stage_name }).catch(() => {});

  return full;
};

// ── getArtists ────────────────────────────────────────────────────────────────

export const getArtists = async (query: CatalogQuery) => {
  const page  = query.page  ?? 1;
  const limit = query.limit ?? 20;
  const order = query.order ?? 'desc';
  const sort  = query.sort  ?? 'created_at';
  const offset = (page - 1) * limit;

  const conditions = [];
  if (query.search) {
    conditions.push(ilike(artist_profiles.stage_name, `%${query.search}%`));
  }
  if (query.status) {
    conditions.push(sql`${artist_profiles}.catalog_status = ${query.status}`);
  }

  const where = conditions.length ? and(...conditions) : undefined;

  const [rows, [{ total }]] = await Promise.all([
    db
      .select({
        id:            artist_profiles.id,
        stage_name:    artist_profiles.stage_name,
        legal_name:    artist_profiles.legal_name,
        bio:           artist_profiles.bio,
        genre:         artist_profiles.genre,
        country:       artist_profiles.country,
        social_links:  artist_profiles.social_links,
        profile_image: artist_profiles.profile_image,
        is_active:     artist_profiles.is_active,
        created_at:    artist_profiles.created_at,
        updated_at:    artist_profiles.updated_at,
        genres:        sql<string[]>`COALESCE(${artist_profiles}.genres, '{}')`,
        countries:     sql<string[]>`COALESCE(${artist_profiles}.countries, '{}')`,
        catalog_status: sql<string>`COALESCE(${artist_profiles}.catalog_status, 'active')`,
      })
      .from(artist_profiles)
      .where(where)
      .orderBy(buildOrder(sort, order))
      .limit(limit)
      .offset(offset),
    db
      .select({ total: count() })
      .from(artist_profiles)
      .where(where),
  ]);

  return {
    data: rows,
    pagination: { page, limit, total: Number(total), pages: Math.ceil(Number(total) / limit) },
  };
};

// ── getArtistById ─────────────────────────────────────────────────────────────

export const getArtistById = async (id: string) => {
  const [artist] = await db.execute<Record<string, unknown>>(sql`
    SELECT
      ap.*,
      COALESCE(ap.genres, '{}')         AS genres,
      COALESCE(ap.countries, '{}')      AS countries,
      COALESCE(ap.catalog_status, 'active') AS catalog_status,
      (SELECT COUNT(*)::int FROM songs    WHERE artist_id = ap.id) AS song_count,
      (SELECT COUNT(*)::int FROM releases WHERE artist_id = ap.id) AS release_count
    FROM artist_profiles ap
    WHERE ap.id = ${id}
    LIMIT 1
  `);

  if (!artist) throw new AppError('Artist not found', 404);
  return artist;
};

// ── updateArtist ──────────────────────────────────────────────────────────────

export const updateArtist = async (id: string, input: UpdateArtistInput) => {
  const existing = await db
    .select({ id: artist_profiles.id })
    .from(artist_profiles)
    .where(eq(artist_profiles.id, id))
    .limit(1);

  if (!existing.length) throw new AppError('Artist not found', 404);

  const { biography, genres, countries, catalog_status, social_links, is_active, ...rest } = input;

  const coreUpdate: Record<string, unknown> = {
    ...rest,
    updated_at: new Date(),
  };
  if (biography !== undefined) coreUpdate.bio = biography;
  if (social_links !== undefined) coreUpdate.social_links = social_links;
  if (is_active !== undefined) coreUpdate.is_active = is_active;

  if (Object.keys(coreUpdate).length > 1) {
    await db.update(artist_profiles).set(coreUpdate).where(eq(artist_profiles.id, id));
  }

  // Update migration-added columns via conditional CASE to avoid overwriting with NULL
  const hasMigrationCols = genres !== undefined || countries !== undefined || catalog_status !== undefined;
  if (hasMigrationCols) {
    await db.execute(sql`
      UPDATE artist_profiles
      SET
        genres         = CASE WHEN ${genres !== undefined} THEN ${JSON.stringify(genres ?? [])}::text[] ELSE genres END,
        countries      = CASE WHEN ${countries !== undefined} THEN ${JSON.stringify(countries ?? [])}::text[] ELSE countries END,
        catalog_status = CASE WHEN ${catalog_status !== undefined} THEN ${catalog_status ?? 'active'} ELSE catalog_status END
      WHERE id = ${id}
    `);
  }

  dispatchEvent('artist.updated', { artist_id: id }).catch(() => {});

  return getArtistById(id);
};

// ── deleteArtist ──────────────────────────────────────────────────────────────

export const deleteArtist = async (id: string) => {
  const [deleted] = await db
    .delete(artist_profiles)
    .where(eq(artist_profiles.id, id))
    .returning({ id: artist_profiles.id });

  if (!deleted) throw new AppError('Artist not found', 404);
  return { id: deleted.id, deleted: true };
};

// ── getArtistStats ────────────────────────────────────────────────────────────

export const getArtistStats = async (id: string) => {
  const existing = await db
    .select({ id: artist_profiles.id })
    .from(artist_profiles)
    .where(eq(artist_profiles.id, id))
    .limit(1);

  if (!existing.length) throw new AppError('Artist not found', 404);

  const [
    songCountRes,
    releaseCountRes,
    creditCountRes,
    missingIsrcRes,
    missingArtworkRes,
  ] = await Promise.all([
    db.select({ c: count() }).from(songs).where(eq(songs.artist_id, id)),
    db.select({ c: count() }).from(releases).where(eq(releases.artist_id, id)),
    db.execute<{ c: string }>(sql`
      SELECT COUNT(*)::int AS c FROM catalog_credits cc
      JOIN songs s ON s.id = cc.song_id
      WHERE s.artist_id = ${id}
    `),
    db.execute<{ c: string }>(sql`
      SELECT COUNT(*)::int AS c FROM songs
      WHERE artist_id = ${id} AND (isrc IS NULL OR isrc = '')
    `),
    db.execute<{ c: string }>(sql`
      SELECT COUNT(*)::int AS c FROM releases r
      WHERE r.artist_id = ${id}
        AND NOT EXISTS (
          SELECT 1 FROM catalog_artwork_assets caa WHERE caa.release_id = r.id
        )
    `),
  ]);

  return {
    song_count:      Number(songCountRes[0]?.c ?? 0),
    release_count:   Number(releaseCountRes[0]?.c ?? 0),
    total_credits:   Number(creditCountRes[0]?.c ?? 0),
    missing_isrc:    Number(missingIsrcRes[0]?.c ?? 0),
    missing_artwork: Number(missingArtworkRes[0]?.c ?? 0),
  };
};

// ── getArtistSongs ────────────────────────────────────────────────────────────

export const getArtistSongs = async (id: string) => {
  const existing = await db
    .select({ id: artist_profiles.id })
    .from(artist_profiles)
    .where(eq(artist_profiles.id, id))
    .limit(1);

  if (!existing.length) throw new AppError('Artist not found', 404);

  return db.execute<Record<string, unknown>>(sql`
    SELECT
      s.*,
      COALESCE(s.writers, '{}')   AS writers,
      COALESCE(s.producers, '{}') AS producers,
      COALESCE(s.tags, '{}')      AS tags
    FROM songs s
    WHERE s.artist_id = ${id}
    ORDER BY s.created_at DESC
  `);
};

// ── getArtistReleases ─────────────────────────────────────────────────────────

export const getArtistReleases = async (id: string) => {
  const existing = await db
    .select({ id: artist_profiles.id })
    .from(artist_profiles)
    .where(eq(artist_profiles.id, id))
    .limit(1);

  if (!existing.length) throw new AppError('Artist not found', 404);

  return db.execute<Record<string, unknown>>(sql`
    SELECT
      r.*,
      COALESCE(r.catalog_release_type, 'single') AS catalog_release_type,
      r.preorder_date
    FROM releases r
    WHERE r.artist_id = ${id}
    ORDER BY r.created_at DESC
  `);
};

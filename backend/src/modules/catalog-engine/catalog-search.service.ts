import { ilike, sql, count } from 'drizzle-orm';
import { db } from '../../db';
import {
  artist_profiles,
  songs,
  releases,
  catalog_artwork_assets,
} from '../../db/schema';
import * as distributionService from '../distribution/distribution.service';

// ── searchCatalog ─────────────────────────────────────────────────────────────

export const searchCatalog = async (query: string, limit = 20) => {
  const [artists, songsResult, releasesResult] = await Promise.all([
    db
      .select({
        id:            artist_profiles.id,
        stage_name:    artist_profiles.stage_name,
        profile_image: artist_profiles.profile_image,
        is_active:     artist_profiles.is_active,
        created_at:    artist_profiles.created_at,
      })
      .from(artist_profiles)
      .where(ilike(artist_profiles.stage_name, `%${query}%`))
      .limit(limit),

    db.execute<Record<string, unknown>>(sql`
      SELECT
        s.id,
        s.title,
        s.isrc,
        s.release_status,
        s.artist_id,
        s.genre,
        s.duration_seconds,
        s.created_at,
        ap.stage_name AS artist_name
      FROM songs s
      LEFT JOIN artist_profiles ap ON ap.id = s.artist_id
      WHERE s.title ILIKE ${'%' + query + '%'}
      LIMIT ${limit}
    `),

    db.execute<Record<string, unknown>>(sql`
      SELECT
        r.id,
        r.release_title AS title,
        r.genre,
        r.upc,
        r.status,
        r.release_date,
        r.cover_art_url,
        r.artist_id,
        r.created_at,
        COALESCE(r.catalog_release_type, 'single') AS catalog_release_type,
        ap.stage_name AS artist_name
      FROM releases r
      LEFT JOIN artist_profiles ap ON ap.id = r.artist_id
      WHERE r.release_title ILIKE ${'%' + query + '%'}
      LIMIT ${limit}
    `),
  ]);

  // Phase 7c: isrc/upc served from Distribution, not the legacy scalar columns.
  const [isrcMap, upcMap] = await Promise.all([
    distributionService.getIsrcMapForSongs(songsResult.map(s => s.id as string)),
    distributionService.getUpcMapForReleases(releasesResult.map(r => r.id as string)),
  ]);
  const songsWithIsrc = songsResult.map(s => ({ ...s, isrc: isrcMap.get(s.id as string) ?? null }));
  const releasesWithUpc = releasesResult.map(r => ({ ...r, upc: upcMap.get(r.id as string) ?? null }));

  return {
    artists,
    songs: songsWithIsrc,
    releases: releasesWithUpc,
    total: artists.length + songsWithIsrc.length + releasesWithUpc.length,
  };
};

// ── getCatalogStats ───────────────────────────────────────────────────────────

export const getCatalogStats = async () => {
  // Run sequentially rather than via Promise.all — firing many concurrent
  // new connections against Supabase's transaction-mode pooler has been
  // observed to stall a connection indefinitely (silently dropped mid-flight,
  // no RST — see getMissingMetadata()'s comment below, the same failure mode,
  // just never fixed here until Phase 7c hit it while adding two more
  // Distribution-backed queries to this same function).
  const totalArtists = await db.select({ c: count() }).from(artist_profiles);
  const totalSongs = await db.select({ c: count() }).from(songs);
  const totalReleases = await db.select({ c: count() }).from(releases);
  const totalAssets = await db.select({ c: count() }).from(catalog_artwork_assets);

  // Phase 7c: isrc/upc presence checked against Distribution, not the
  // legacy scalar columns.
  const missingIsrc = await db.execute<{ c: string }>(sql`
    SELECT COUNT(*)::int AS c FROM songs s
    WHERE NOT EXISTS (
      SELECT 1 FROM distribution_identifiers di WHERE di.song_id = s.id AND di.identifier_type = 'isrc'
    )
  `);

  const missingArtwork = await db.execute<{ c: string }>(sql`
    SELECT COUNT(*)::int AS c FROM releases r
    WHERE NOT EXISTS (
      SELECT 1 FROM catalog_artwork_assets caa WHERE caa.release_id = r.id
    )
  `);

  const missingUpc = await db.execute<{ c: string }>(sql`
    SELECT COUNT(*)::int AS c FROM releases r
    WHERE NOT EXISTS (
      SELECT 1 FROM distribution_identifiers di WHERE di.release_id = r.id AND di.identifier_type = 'upc'
    )
  `);

  const songsWithoutReleases = await db.execute<{ c: string }>(sql`
    SELECT COUNT(*)::int AS c FROM songs s
    WHERE NOT EXISTS (
      SELECT 1 FROM catalog_tracks ct WHERE ct.song_id = s.id
    )
  `);

  const releasesWithoutArtwork = await db.execute<{ c: string }>(sql`
    SELECT COUNT(*)::int AS c FROM releases r
    WHERE NOT EXISTS (
      SELECT 1 FROM catalog_artwork_assets caa
      WHERE caa.release_id = r.id AND caa.artwork_type = 'cover'
    )
  `);

  const incompleteCredits = await db.execute<{ c: string }>(sql`
    SELECT COUNT(*)::int AS c FROM songs s
    WHERE NOT EXISTS (
      SELECT 1 FROM catalog_credits cc WHERE cc.song_id = s.id AND cc.role = 'writer'
    )
  `);

  const upcomingReleases = await db.execute<{ c: string }>(sql`
    SELECT COUNT(*)::int AS c FROM releases
    WHERE release_date IS NOT NULL
      AND release_date > CURRENT_DATE
      AND release_date <= CURRENT_DATE + INTERVAL '30 days'
  `);

  return {
    total_artists:           Number(totalArtists[0]?.c ?? 0),
    total_songs:             Number(totalSongs[0]?.c ?? 0),
    total_releases:          Number(totalReleases[0]?.c ?? 0),
    total_assets:            Number(totalAssets[0]?.c ?? 0),
    missing_isrc:            Number(missingIsrc[0]?.c ?? 0),
    missing_artwork:         Number(missingArtwork[0]?.c ?? 0),
    missing_upc:             Number(missingUpc[0]?.c ?? 0),
    songs_without_releases:  Number(songsWithoutReleases[0]?.c ?? 0),
    releases_without_artwork: Number(releasesWithoutArtwork[0]?.c ?? 0),
    incomplete_credits:      Number(incompleteCredits[0]?.c ?? 0),
    upcoming_releases:       Number(upcomingReleases[0]?.c ?? 0),
  };
};

// ── getMissingMetadata ────────────────────────────────────────────────────────

export const getMissingMetadata = async () => {
  // Run sequentially rather than via Promise.all — firing all 7 as concurrent
  // new connections against Supabase's transaction-mode pooler (on top of the
  // 8 concurrent queries getMissionBrief already issues alongside this call)
  // has been observed to stall a connection indefinitely (silently dropped
  // mid-flight, no RST — the same failure mode documented in db/index.ts).
  // Sequential execution trades a bit of latency for actually completing.
  // Phase 7c: isrc/upc presence checked against Distribution, not the legacy
  // scalar columns.
  const missingIsrcRows = await db.execute<{ song_id: string; title: string; artist_name: string }>(sql`
    SELECT s.id AS song_id, s.title, ap.stage_name AS artist_name
    FROM songs s
    LEFT JOIN artist_profiles ap ON ap.id = s.artist_id
    WHERE NOT EXISTS (
      SELECT 1 FROM distribution_identifiers di WHERE di.song_id = s.id AND di.identifier_type = 'isrc'
    )
    ORDER BY s.created_at DESC
    LIMIT 100
  `);

  const missingUpcRows = await db.execute<{ release_id: string; title: string; artist_name: string }>(sql`
    SELECT r.id AS release_id, r.release_title AS title, ap.stage_name AS artist_name
    FROM releases r
    LEFT JOIN artist_profiles ap ON ap.id = r.artist_id
    WHERE NOT EXISTS (
      SELECT 1 FROM distribution_identifiers di WHERE di.release_id = r.id AND di.identifier_type = 'upc'
    )
    ORDER BY r.created_at DESC
    LIMIT 100
  `);

  const missingArtworkRows = await db.execute<{ release_id: string; title: string; artist_name: string }>(sql`
    SELECT r.id AS release_id, r.release_title AS title, ap.stage_name AS artist_name
    FROM releases r
    LEFT JOIN artist_profiles ap ON ap.id = r.artist_id
    WHERE NOT EXISTS (
      SELECT 1 FROM catalog_artwork_assets caa WHERE caa.release_id = r.id
    )
    ORDER BY r.created_at DESC
    LIMIT 100
  `);

  const songsWithoutReleasesRows = await db.execute<{ song_id: string; title: string; artist_name: string }>(sql`
    SELECT s.id AS song_id, s.title, ap.stage_name AS artist_name
    FROM songs s
    LEFT JOIN artist_profiles ap ON ap.id = s.artist_id
    WHERE NOT EXISTS (
      SELECT 1 FROM catalog_tracks ct WHERE ct.song_id = s.id
    )
    ORDER BY s.created_at DESC
    LIMIT 100
  `);

  const incompleteCreditsRows = await db.execute<{ song_id: string; title: string; missing_roles: string[] }>(sql`
    SELECT
      s.id AS song_id,
      s.title,
      ARRAY['writer'] AS missing_roles
    FROM songs s
    WHERE NOT EXISTS (
      SELECT 1 FROM catalog_credits cc
      WHERE cc.song_id = s.id AND cc.role = 'writer'
    )
    ORDER BY s.created_at DESC
    LIMIT 100
  `);

  const upcomingReleasesRows = await db.execute<{ release_id: string; title: string; release_date: string; days_until: number }>(sql`
    SELECT
      r.id AS release_id,
      r.release_title AS title,
      r.release_date::text,
      (r.release_date - CURRENT_DATE)::int AS days_until
    FROM releases r
    WHERE r.release_date IS NOT NULL
      AND r.release_date > CURRENT_DATE
      AND r.release_date <= CURRENT_DATE + INTERVAL '30 days'
    ORDER BY r.release_date ASC
  `);

  const missingContractsRows = await db.execute<{ release_id: string; title: string; artist_name: string }>(sql`
    SELECT r.id AS release_id, r.release_title AS title, ap.stage_name AS artist_name
    FROM releases r
    LEFT JOIN artist_profiles ap ON ap.id = r.artist_id
    WHERE NOT EXISTS (
      SELECT 1 FROM catalog_documents cd
      WHERE cd.release_id = r.id AND cd.document_type = 'contract'
    )
    ORDER BY r.created_at DESC
    LIMIT 100
  `);

  return {
    missing_isrc:           missingIsrcRows,
    missing_upc:            missingUpcRows,
    missing_artwork:        missingArtworkRows,
    songs_without_releases: songsWithoutReleasesRows,
    incomplete_credits:     incompleteCreditsRows,
    upcoming_releases:      upcomingReleasesRows,
    missing_contracts:      missingContractsRows,
  };
};

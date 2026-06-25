import { ilike, sql, count } from 'drizzle-orm';
import { db } from '../../db';
import {
  artist_profiles,
  songs,
  releases,
  catalog_artwork_assets,
} from '../../db/schema';

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

  return {
    artists,
    songs: songsResult,
    releases: releasesResult,
    total: artists.length + songsResult.length + releasesResult.length,
  };
};

// ── getCatalogStats ───────────────────────────────────────────────────────────

export const getCatalogStats = async () => {
  const [
    totalArtists,
    totalSongs,
    totalReleases,
    totalAssets,
    missingIsrc,
    missingArtwork,
    missingUpc,
    songsWithoutReleases,
    releasesWithoutArtwork,
    incompleteCredits,
    upcomingReleases,
  ] = await Promise.all([
    db.select({ c: count() }).from(artist_profiles),
    db.select({ c: count() }).from(songs),
    db.select({ c: count() }).from(releases),
    db.select({ c: count() }).from(catalog_artwork_assets),

    db.execute<{ c: string }>(sql`
      SELECT COUNT(*)::int AS c FROM songs
      WHERE isrc IS NULL OR isrc = ''
    `),

    db.execute<{ c: string }>(sql`
      SELECT COUNT(*)::int AS c FROM releases r
      WHERE NOT EXISTS (
        SELECT 1 FROM catalog_artwork_assets caa WHERE caa.release_id = r.id
      )
    `),

    db.execute<{ c: string }>(sql`
      SELECT COUNT(*)::int AS c FROM releases
      WHERE upc IS NULL OR upc = ''
    `),

    db.execute<{ c: string }>(sql`
      SELECT COUNT(*)::int AS c FROM songs s
      WHERE NOT EXISTS (
        SELECT 1 FROM catalog_tracks ct WHERE ct.song_id = s.id
      )
    `),

    db.execute<{ c: string }>(sql`
      SELECT COUNT(*)::int AS c FROM releases r
      WHERE NOT EXISTS (
        SELECT 1 FROM catalog_artwork_assets caa
        WHERE caa.release_id = r.id AND caa.artwork_type = 'cover'
      )
    `),

    db.execute<{ c: string }>(sql`
      SELECT COUNT(*)::int AS c FROM songs s
      WHERE NOT EXISTS (
        SELECT 1 FROM catalog_credits cc WHERE cc.song_id = s.id AND cc.role = 'writer'
      )
    `),

    db.execute<{ c: string }>(sql`
      SELECT COUNT(*)::int AS c FROM releases
      WHERE release_date IS NOT NULL
        AND release_date > CURRENT_DATE
        AND release_date <= CURRENT_DATE + INTERVAL '30 days'
    `),
  ]);

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
  const [
    missingIsrcRows,
    missingUpcRows,
    missingArtworkRows,
    songsWithoutReleasesRows,
    incompleteCreditsRows,
    upcomingReleasesRows,
    missingContractsRows,
  ] = await Promise.all([
    // Songs missing ISRC
    db.execute<{ song_id: string; title: string; artist_name: string }>(sql`
      SELECT s.id AS song_id, s.title, ap.stage_name AS artist_name
      FROM songs s
      LEFT JOIN artist_profiles ap ON ap.id = s.artist_id
      WHERE s.isrc IS NULL OR s.isrc = ''
      ORDER BY s.created_at DESC
      LIMIT 100
    `),

    // Releases missing UPC
    db.execute<{ release_id: string; title: string; artist_name: string }>(sql`
      SELECT r.id AS release_id, r.release_title AS title, ap.stage_name AS artist_name
      FROM releases r
      LEFT JOIN artist_profiles ap ON ap.id = r.artist_id
      WHERE r.upc IS NULL OR r.upc = ''
      ORDER BY r.created_at DESC
      LIMIT 100
    `),

    // Releases missing artwork
    db.execute<{ release_id: string; title: string; artist_name: string }>(sql`
      SELECT r.id AS release_id, r.release_title AS title, ap.stage_name AS artist_name
      FROM releases r
      LEFT JOIN artist_profiles ap ON ap.id = r.artist_id
      WHERE NOT EXISTS (
        SELECT 1 FROM catalog_artwork_assets caa WHERE caa.release_id = r.id
      )
      ORDER BY r.created_at DESC
      LIMIT 100
    `),

    // Songs not linked to any release
    db.execute<{ song_id: string; title: string; artist_name: string }>(sql`
      SELECT s.id AS song_id, s.title, ap.stage_name AS artist_name
      FROM songs s
      LEFT JOIN artist_profiles ap ON ap.id = s.artist_id
      WHERE NOT EXISTS (
        SELECT 1 FROM catalog_tracks ct WHERE ct.song_id = s.id
      )
      ORDER BY s.created_at DESC
      LIMIT 100
    `),

    // Songs without a 'writer' credit
    db.execute<{ song_id: string; title: string; missing_roles: string[] }>(sql`
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
    `),

    // Upcoming releases in the next 30 days
    db.execute<{ release_id: string; title: string; release_date: string; days_until: number }>(sql`
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
    `),

    // Releases missing signed contracts (from catalog_documents)
    db.execute<{ release_id: string; title: string; artist_name: string }>(sql`
      SELECT r.id AS release_id, r.release_title AS title, ap.stage_name AS artist_name
      FROM releases r
      LEFT JOIN artist_profiles ap ON ap.id = r.artist_id
      WHERE NOT EXISTS (
        SELECT 1 FROM catalog_documents cd
        WHERE cd.release_id = r.id AND cd.document_type = 'contract'
      )
      ORDER BY r.created_at DESC
      LIMIT 100
    `),
  ]);

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

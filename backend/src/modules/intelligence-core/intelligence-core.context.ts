import { eq, desc, inArray, and, ne, count } from 'drizzle-orm';
import { db } from '../../db';
import {
  releases,
  songs,
  audio_uploads,
  audio_dna,
  sync_intelligence,
  artist_profiles,
  fan_profiles,
} from '../../db/schema';
import { platform_metrics } from '../../db/growth-schema';
import { AppError } from '../../middleware/errorHandler';
import type { IntelligenceContext } from './intelligence-core.types';

/**
 * The single place the releases -> songs -> audio_uploads -> audio_dna /
 * sync_intelligence join lives, plus whatever artist/fan/platform signal is
 * available. Any module that needs release context should call this instead
 * of re-deriving the join.
 */
export async function buildReleaseContext(releaseId: string): Promise<IntelligenceContext> {
  const [release] = await db.select().from(releases).where(eq(releases.id, releaseId)).limit(1);
  if (!release) throw new AppError('Release not found', 404, 'RELEASE_NOT_FOUND');

  const releaseSongs = await db.select().from(songs).where(eq(songs.release_id, releaseId));

  let artist: IntelligenceContext['artist'] = null;
  const artistId = release.artist_id ?? releaseSongs[0]?.artist_id ?? null;
  if (artistId) {
    const [artistRow] = await db
      .select({ id: artist_profiles.id, genre: artist_profiles.genre, country: artist_profiles.country })
      .from(artist_profiles)
      .where(eq(artist_profiles.id, artistId))
      .limit(1);
    artist = artistRow ?? null;
  }

  // Resolve the most recently uploaded audio across the release's songs —
  // that upload's downstream analysis (DNA/sync) represents the release for scoring.
  let resolvedUpload = null;
  const songIds = releaseSongs.map((s) => s.id);
  if (songIds.length > 0) {
    const uploads = await db
      .select()
      .from(audio_uploads)
      .where(inArray(audio_uploads.song_id, songIds))
      .orderBy(desc(audio_uploads.created_at))
      .limit(1);
    resolvedUpload = uploads[0] ?? null;
  }

  let audioDna = null;
  let syncIntel = null;
  if (resolvedUpload) {
    const [dnaRow] = await db
      .select()
      .from(audio_dna)
      .where(eq(audio_dna.upload_id, resolvedUpload.id))
      .limit(1);
    audioDna = dnaRow ?? null;

    const [syncRow] = await db
      .select()
      .from(sync_intelligence)
      .where(eq(sync_intelligence.upload_id, resolvedUpload.id))
      .limit(1);
    syncIntel = syncRow ?? null;
  }

  // fan_profiles carries no artist_id in the current schema (single-roster
  // fan base) — total count/country breakdown is the best real signal available.
  const fanRows = await db.select({ country: fan_profiles.country }).from(fan_profiles);
  const fanCountryBreakdown: Record<string, number> = {};
  for (const row of fanRows) {
    const key = row.country ?? 'unknown';
    fanCountryBreakdown[key] = (fanCountryBreakdown[key] ?? 0) + 1;
  }

  let platformTopCountries: string[] = [];
  if (artistId) {
    const metricsRows = await db
      .select({ top_country: platform_metrics.top_country })
      .from(platform_metrics)
      .where(eq(platform_metrics.artist_id, artistId))
      .orderBy(desc(platform_metrics.period_end))
      .limit(20);
    platformTopCountries = Array.from(
      new Set(metricsRows.map((r) => r.top_country).filter((c): c is string => !!c)),
    );
  }

  let pastReleaseCount = 0;
  if (artistId) {
    const [row] = await db
      .select({ n: count() })
      .from(releases)
      .where(and(eq(releases.artist_id, artistId), eq(releases.music_status, 'released'), ne(releases.id, releaseId)));
    pastReleaseCount = Number(row?.n ?? 0);
  }

  return {
    release,
    songs: releaseSongs,
    artist,
    resolvedUpload,
    audioDna,
    syncIntelligence: syncIntel,
    fanCount: fanRows.length,
    fanCountryBreakdown,
    platformTopCountries,
    pastReleaseCount,
  };
}

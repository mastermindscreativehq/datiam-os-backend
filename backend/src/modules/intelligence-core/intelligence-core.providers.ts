import { getCommercialIntelligenceReport } from '../commercial-intelligence/commercial-intelligence.service';
import { SYNC_CATEGORY_LABELS, type SyncCategory } from '../sync-intelligence/sync-intelligence.types';
import { registerProvider } from './intelligence-core.registry';
import type { IntelligenceContext, IntelligenceProvider, ProviderResult } from './intelligence-core.types';

function n(v: string | number | null | undefined): number | null {
  if (v === null || v === undefined) return null;
  const parsed = typeof v === 'string' ? parseFloat(v) : v;
  return Number.isNaN(parsed) ? null : parsed;
}

// A small, transparent genre→playlist-friendliness prior used only when no
// audio analysis exists yet. Reused nowhere else — this is the fallback of
// last resort, not the primary signal (audio_dna/songs scores take priority).
const GENRE_PLAYLIST_PRIOR: Record<string, number> = {
  afrobeats: 75, pop: 70, hiphop: 65, 'hip hop': 65, rap: 65, rnb: 65, 'r&b': 65,
  dancehall: 62, amapiano: 68, electronic: 60, dance: 68, gospel: 50, reggae: 55,
  rock: 48, alternative: 45, indie: 45, folk: 40, jazz: 35, classical: 25,
  instrumental: 30, experimental: 25,
};

function durationSweetSpotScore(durationSeconds: number | null): number | null {
  if (!durationSeconds) return null;
  // 2:30–3:30 is the commercial/playlist sweet spot for streaming platforms.
  if (durationSeconds >= 150 && durationSeconds <= 210) return 100;
  const distance = durationSeconds < 150 ? 150 - durationSeconds : durationSeconds - 210;
  return Math.max(0, 100 - distance * 0.8);
}

function bpmSweetSpotScore(bpm: number | null): number | null {
  if (!bpm) return null;
  // 90–128bpm covers most commercially playlisted dance/pop/afrobeats tempo range.
  if (bpm >= 90 && bpm <= 128) return 100;
  const distance = bpm < 90 ? 90 - bpm : bpm - 128;
  return Math.max(0, 100 - distance * 1.5);
}

/**
 * Reuses the existing Commercial Intelligence engine directly — no scoring
 * logic is duplicated here. Falls back to a metadata-only heuristic only
 * when no audio analysis exists yet for the release.
 */
export const commercialProvider: IntelligenceProvider = {
  key: 'commercial',
  async analyze(ctx: IntelligenceContext): Promise<ProviderResult> {
    if (ctx.resolvedUpload && ctx.audioDna && ctx.syncIntelligence) {
      try {
        const report = await getCommercialIntelligenceReport(ctx.resolvedUpload.id);
        return {
          key: 'commercial',
          score: report.commercialPlacementPotential.score,
          summary: report.datiamVerdict.executiveSummary,
          dataCompleteness: 'full',
          raw: {
            classification: report.commercialPlacementPotential.classification,
            recommendation: report.datiamVerdict.recommendation,
            bestOpportunity: report.datiamVerdict.bestOpportunity,
            bestAudience: report.datiamVerdict.bestAudience,
            revenueTierExpected: report.revenueTierForecast.expected.formattedTotal,
          },
        };
      } catch {
        // Fall through to the metadata heuristic below.
      }
    }

    const genreScore = ctx.release.genre ? GENRE_PLAYLIST_PRIOR[ctx.release.genre.toLowerCase()] ?? null : null;
    const trackRecordBonus = Math.min(ctx.pastReleaseCount * 3, 15);
    const parts = [genreScore, genreScore !== null ? genreScore + trackRecordBonus : null].filter(
      (v): v is number => v !== null,
    );
    const score = parts.length > 0 ? Math.min(100, parts[parts.length - 1]) : null;

    return {
      key: 'commercial',
      score,
      summary: score !== null
        ? `No audio analysis yet — estimate based on genre (${ctx.release.genre}) and ${ctx.pastReleaseCount} prior release(s) by this artist. Upload audio and run Sync Intelligence for a full commercial report.`
        : 'Insufficient data to estimate commercial potential — no genre set and no audio analysis available yet.',
      dataCompleteness: 'metadata_only',
    };
  },
};

/**
 * Reads sync_intelligence directly (already resolved onto context) rather
 * than re-deriving anything the Sync Intelligence engine already computed.
 */
export const syncProvider: IntelligenceProvider = {
  key: 'sync',
  async analyze(ctx: IntelligenceContext): Promise<ProviderResult> {
    if (ctx.syncIntelligence) {
      const si = ctx.syncIntelligence;
      const topCategories = ((si.top_categories as SyncCategory[] | null) ?? [])
        .map((c) => SYNC_CATEGORY_LABELS[c] ?? c)
        .slice(0, 3);
      return {
        key: 'sync',
        score: n(si.overall_sync_score),
        summary: topCategories.length > 0
          ? `Top sync categories: ${topCategories.join(', ')}.`
          : 'Sync analysis complete; no category scored above threshold.',
        dataCompleteness: 'full',
        raw: { topCategories: si.top_categories, syncTags: si.sync_tags },
      };
    }

    return {
      key: 'sync',
      score: null,
      summary: 'Sync suitability requires audio analysis (Audio DNA + Sync Intelligence) — upload audio for this release to enable scoring.',
      dataCompleteness: 'metadata_only',
    };
  },
};

/**
 * Canonical playlist-suitability scoring — no such engine exists elsewhere.
 * A future dedicated Playlist Intel module can replace this by registering
 * another provider under the 'playlist' key; the orchestrator doesn't change.
 */
export const playlistProvider: IntelligenceProvider = {
  key: 'playlist',
  async analyze(ctx: IntelligenceContext): Promise<ProviderResult> {
    const leadSong = ctx.songs[0] ?? null;
    const danceability = n(ctx.audioDna?.danceability);
    const energyScore = leadSong ? n(leadSong.energy_score) : null; // stored 0.00-1.00
    const durationScore = durationSweetSpotScore(leadSong?.duration_seconds ?? null);
    const bpmScore = bpmSweetSpotScore(leadSong?.bpm ?? null);
    const genreScore = ctx.release.genre
      ? GENRE_PLAYLIST_PRIOR[ctx.release.genre.toLowerCase()] ?? null
      : leadSong?.genre
        ? GENRE_PLAYLIST_PRIOR[leadSong.genre.toLowerCase()] ?? null
        : null;

    const weighted: Array<{ value: number | null; weight: number }> = [
      { value: danceability, weight: 0.30 },
      { value: energyScore !== null ? energyScore * 100 : null, weight: 0.25 },
      { value: durationScore, weight: 0.20 },
      { value: genreScore, weight: 0.15 },
      { value: bpmScore, weight: 0.10 },
    ];

    const usable = weighted.filter((w) => w.value !== null) as Array<{ value: number; weight: number }>;
    if (usable.length === 0) {
      return {
        key: 'playlist',
        score: null,
        summary: 'Insufficient data to estimate playlist suitability — no genre, BPM, duration, or audio analysis available yet.',
        dataCompleteness: 'metadata_only',
      };
    }

    const totalWeight = usable.reduce((sum, w) => sum + w.weight, 0);
    const score = Math.round(usable.reduce((sum, w) => sum + w.value * w.weight, 0) / totalWeight);
    const dataCompleteness = ctx.audioDna && energyScore !== null ? 'full' : 'metadata_only';

    const signals: string[] = [];
    if (danceability !== null) signals.push(`danceability ${Math.round(danceability)}/100`);
    if (energyScore !== null) signals.push(`energy ${Math.round(energyScore * 100)}/100`);
    if (durationScore !== null) signals.push(`duration ${leadSong?.duration_seconds}s`);
    if (bpmScore !== null) signals.push(`${leadSong?.bpm} BPM`);

    return {
      key: 'playlist',
      score,
      summary: `Playlist fit based on ${signals.join(', ') || 'genre only'}.`,
      dataCompleteness,
      raw: { danceability, energyScore, durationScore, bpmScore, genreScore },
    };
  },
};

registerProvider(commercialProvider);
registerProvider(syncProvider);
registerProvider(playlistProvider);

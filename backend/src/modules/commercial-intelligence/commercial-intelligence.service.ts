import { eq } from 'drizzle-orm';
import { db } from '../../db';
import { audio_dna, energy_analysis, sync_intelligence, audio_uploads } from '../../db/schema';
import type { DnaInputForSync, SyncCategory, CategoryScore } from '../sync-intelligence/sync-intelligence.types';
import { SYNC_CATEGORIES, SYNC_CATEGORY_LABELS } from '../sync-intelligence/sync-intelligence.types';
import type { CommercialIntelligenceReport } from './commercial-intelligence.types';

import { buildWhyScores } from './why-engine';
import { buildExecutiveSyncAssessment } from './executive-assessment';
import { buildCommercialPlacementPotential } from './commercial-placement';
import { buildMarketAlignment } from './market-alignment';
import { buildRevenueForecast } from './revenue-forecast';
import { buildComparableArtists } from './comparable-artists';
import { buildSyncRiskAssessment } from './risk-assessment';
import { buildDecisionEngine } from './decision-engine';
import { buildDatiamVerdict } from './verdict-engine';

// ── Helpers ───────────────────────────────────────────────────────────────────

function n(v: string | number | null | undefined): number {
  if (v === null || v === undefined) return 0;
  const parsed = typeof v === 'string' ? parseFloat(v) : v;
  return isNaN(parsed) ? 0 : parsed;
}

function reconstructCategoryScores(
  si: typeof sync_intelligence.$inferSelect,
): Record<SyncCategory, CategoryScore> {
  return {
    film_trailer: {
      category: 'film_trailer', label: SYNC_CATEGORY_LABELS['film_trailer'],
      score: n(si.film_trailer), confidence: n(si.film_trailer_confidence),
      rationale: `Score: ${n(si.film_trailer)}, Confidence: ${n(si.film_trailer_confidence)}`,
    },
    netflix_drama: {
      category: 'netflix_drama', label: SYNC_CATEGORY_LABELS['netflix_drama'],
      score: n(si.netflix_drama), confidence: n(si.netflix_drama_confidence),
      rationale: `Score: ${n(si.netflix_drama)}, Confidence: ${n(si.netflix_drama_confidence)}`,
    },
    documentary: {
      category: 'documentary', label: SYNC_CATEGORY_LABELS['documentary'],
      score: n(si.documentary), confidence: n(si.documentary_confidence),
      rationale: `Score: ${n(si.documentary)}, Confidence: ${n(si.documentary_confidence)}`,
    },
    sports_content: {
      category: 'sports_content', label: SYNC_CATEGORY_LABELS['sports_content'],
      score: n(si.sports_content), confidence: n(si.sports_content_confidence),
      rationale: `Score: ${n(si.sports_content)}, Confidence: ${n(si.sports_content_confidence)}`,
    },
    gaming: {
      category: 'gaming', label: SYNC_CATEGORY_LABELS['gaming'],
      score: n(si.gaming), confidence: n(si.gaming_confidence),
      rationale: `Score: ${n(si.gaming)}, Confidence: ${n(si.gaming_confidence)}`,
    },
    fashion: {
      category: 'fashion', label: SYNC_CATEGORY_LABELS['fashion'],
      score: n(si.fashion), confidence: n(si.fashion_confidence),
      rationale: `Score: ${n(si.fashion)}, Confidence: ${n(si.fashion_confidence)}`,
    },
    luxury_brands: {
      category: 'luxury_brands', label: SYNC_CATEGORY_LABELS['luxury_brands'],
      score: n(si.luxury_brands), confidence: n(si.luxury_brands_confidence),
      rationale: `Score: ${n(si.luxury_brands)}, Confidence: ${n(si.luxury_brands_confidence)}`,
    },
    travel_campaigns: {
      category: 'travel_campaigns', label: SYNC_CATEGORY_LABELS['travel_campaigns'],
      score: n(si.travel_campaigns), confidence: n(si.travel_confidence),
      rationale: `Score: ${n(si.travel_campaigns)}, Confidence: ${n(si.travel_confidence)}`,
    },
    commercial_ads: {
      category: 'commercial_ads', label: SYNC_CATEGORY_LABELS['commercial_ads'],
      score: n(si.commercial_ads), confidence: n(si.commercial_confidence),
      rationale: `Score: ${n(si.commercial_ads)}, Confidence: ${n(si.commercial_confidence)}`,
    },
    social_content: {
      category: 'social_content', label: SYNC_CATEGORY_LABELS['social_content'],
      score: n(si.social_content), confidence: n(si.social_confidence),
      rationale: `Score: ${n(si.social_content)}, Confidence: ${n(si.social_confidence)}`,
    },
  };
}

function buildDnaInput(
  dna: typeof audio_dna.$inferSelect,
  energy: typeof energy_analysis.$inferSelect | null,
): DnaInputForSync {
  return {
    primaryGenre:   dna.primary_genre ?? 'Unknown',
    secondaryGenre: dna.secondary_genre ?? null,
    moodPrimary:    dna.mood_primary ?? 'Unknown',
    moodSecondary:  dna.mood_secondary ?? null,

    danceability: n(dna.danceability),
    brightness:   n(dna.brightness),
    warmth:       n(dna.warmth),
    darkness:     n(dna.darkness),
    aggression:   n(dna.aggression),
    spirituality: n(dna.spirituality),
    romance:      n(dna.romance),
    triumph:      n(dna.triumph),
    melancholy:   n(dna.melancholy),
    tension:      n(dna.tension),

    energyArc:    energy?.energy_arc ?? null,
    dropStrength: n(energy?.drop_strength),
    volatility:   n(energy?.energy_volatility),
    retention:    n(energy?.replay_retention),
  };
}

// ── Public API ─────────────────────────────────────────────────────────────────

export async function getCommercialIntelligenceReport(uploadId: string): Promise<CommercialIntelligenceReport> {
  // Parallel fetch all source data
  const [dnaRows, energyRows, siRows, uploadRows] = await Promise.all([
    db.select().from(audio_dna).where(eq(audio_dna.upload_id, uploadId)).limit(1),
    db.select().from(energy_analysis).where(eq(energy_analysis.upload_id, uploadId)).limit(1),
    db.select().from(sync_intelligence).where(eq(sync_intelligence.upload_id, uploadId)).limit(1),
    db.select({ file_name: audio_uploads.file_name }).from(audio_uploads).where(eq(audio_uploads.id, uploadId)).limit(1),
  ]);

  if (dnaRows.length === 0) {
    throw new Error(`No Audio DNA analysis found for upload ${uploadId}. Run Audio DNA analysis first.`);
  }
  if (siRows.length === 0) {
    throw new Error(`No Sync Intelligence analysis found for upload ${uploadId}. Run Sync Intelligence analysis first.`);
  }

  const dna    = dnaRows[0];
  const energy = energyRows[0] ?? null;
  const si     = siRows[0];
  const fileName = uploadRows[0]?.file_name ?? null;

  const dnaInput       = buildDnaInput(dna, energy);
  const categoryScores = reconstructCategoryScores(si);
  const overallScore   = n(si.overall_sync_score);

  const topCategories = (si.top_categories as SyncCategory[] | null) ??
    SYNC_CATEGORIES
      .map(c => ({ c, s: categoryScores[c].score }))
      .sort((a, b) => b.s - a.s)
      .filter(({ s }) => s >= 40)
      .map(({ c }) => c);

  // Run all 9 intelligence engines
  const [
    whyScores,
    executiveSyncAssessment,
    commercialPlacementPotential,
    marketAlignment,
    revenueForecast,
    comparableArtists,
    syncRiskAssessment,
    decisionEngine,
    datiamVerdict,
  ] = await Promise.all([
    Promise.resolve(buildWhyScores(dnaInput, categoryScores)),
    Promise.resolve(buildExecutiveSyncAssessment(dnaInput, topCategories, overallScore)),
    Promise.resolve(buildCommercialPlacementPotential(overallScore)),
    Promise.resolve(buildMarketAlignment(categoryScores)),
    Promise.resolve(buildRevenueForecast(categoryScores)),
    Promise.resolve(buildComparableArtists(dnaInput)),
    Promise.resolve(buildSyncRiskAssessment(dnaInput, categoryScores, overallScore)),
    Promise.resolve(buildDecisionEngine(categoryScores, overallScore)),
    Promise.resolve(buildDatiamVerdict(dnaInput, categoryScores, overallScore)),
  ]);

  return {
    uploadId,
    fileName,
    overallSyncScore: overallScore,
    generatedAt: new Date().toISOString(),
    whyScores,
    executiveSyncAssessment,
    commercialPlacementPotential,
    marketAlignment,
    revenueForecast,
    comparableArtists,
    syncRiskAssessment,
    decisionEngine,
    datiamVerdict,
  };
}

export async function getArtistCommercialReports(artistId: string, limit = 10): Promise<CommercialIntelligenceReport[]> {
  const siRows = await db
    .select()
    .from(sync_intelligence)
    .where(eq(sync_intelligence.artist_id, artistId))
    .orderBy(sync_intelligence.created_at)
    .limit(limit);

  const reports = await Promise.allSettled(
    siRows.map(si => getCommercialIntelligenceReport(si.upload_id)),
  );

  return reports
    .filter((r): r is PromiseFulfilledResult<CommercialIntelligenceReport> => r.status === 'fulfilled')
    .map(r => r.value);
}

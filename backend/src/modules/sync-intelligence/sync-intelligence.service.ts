import { AppError } from '../../middleware/errorHandler';
import { logActivity } from '../../lib/activityLogger';
import { computeSyncIntelligence } from './sync-intelligence.analyzer';
import type { DnaInputForSync, SyncScoreResult } from './sync-intelligence.types';
import {
  createSyncJob,
  markSyncJobStarted,
  markSyncJobDone,
  getUploadForSync,
  getDnaForSync,
  saveSyncResult,
  getSyncResult,
  getLatestSyncJob,
  getSyncByArtist,
  getTopSyncOpportunities,
} from './sync-intelligence.repository';

export {
  createSyncJob,
  markSyncJobStarted,
  markSyncJobDone,
  getSyncResult,
  getLatestSyncJob,
};

// ── Pre-flight check ──────────────────────────────────────────────────────────

export async function validateSyncPrerequisites(uploadId: string): Promise<void> {
  const upload = await getUploadForSync(uploadId);
  if (!upload) throw new AppError('Upload not found', 404, 'UPLOAD_NOT_FOUND');

  const dna = await getDnaForSync(uploadId);
  if (!dna) {
    throw new AppError(
      'Audio DNA analysis must complete before Sync Intelligence can run. Analyse the DNA first.',
      400,
      'DNA_NOT_READY',
    );
  }
}

// ── Core processing (called by worker) ───────────────────────────────────────

export async function processSyncIntelligence(
  uploadId: string,
): Promise<SyncScoreResult> {
  const upload = await getUploadForSync(uploadId);
  if (!upload) throw new AppError('Upload not found', 404, 'UPLOAD_NOT_FOUND');

  const dna = await getDnaForSync(uploadId);
  if (!dna) throw new AppError('DNA analysis not found', 404, 'DNA_NOT_FOUND');

  const n = (v: unknown) => (v !== null && v !== undefined ? parseFloat(String(v)) : 50);

  const input: DnaInputForSync = {
    primaryGenre:   String(dna.primary_genre ?? 'Unknown'),
    secondaryGenre: dna.secondary_genre ? String(dna.secondary_genre) : null,
    moodPrimary:    String(dna.mood_primary ?? 'Neutral'),
    moodSecondary:  dna.mood_secondary ? String(dna.mood_secondary) : null,

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

    energyArc:    (dna.energy_fingerprint as Record<string, unknown> | null)?.['arc_type'] as string ?? null,
    dropStrength: n((dna.energy_fingerprint as Record<string, unknown> | null)?.['drop_impact']),
    volatility:   n((dna.energy_fingerprint as Record<string, unknown> | null)?.['volatility']),
    retention:    n((dna.energy_fingerprint as Record<string, unknown> | null)?.['retention']),
  };

  const result = computeSyncIntelligence(input);

  await saveSyncResult(uploadId, upload.artist_id ?? null, result);

  logActivity({
    eventType:   'sync_intelligence.analysis.complete',
    module:      'sync-intelligence',
    title:       `Sync Intelligence: ${result.overallSyncScore}/100 overall`,
    description: `Top categories: ${result.topCategories.slice(0, 3).join(', ')} | Tags: ${result.syncTags.slice(0, 4).join(', ')}`,
    metadata:    {
      upload_id:          uploadId,
      artist_id:          upload.artist_id,
      overall_sync_score: result.overallSyncScore,
      top_category:       result.topCategories[0],
    },
  });

  return result;
}

// ── Read helpers (re-exported with artist queries) ────────────────────────────

export async function getArtistSyncLibrary(artistId: string, limit = 20) {
  return getSyncByArtist(artistId, limit);
}

export async function getArtistTopOpportunities(artistId: string, minScore = 60, limit = 10) {
  return getTopSyncOpportunities(artistId, minScore, limit);
}

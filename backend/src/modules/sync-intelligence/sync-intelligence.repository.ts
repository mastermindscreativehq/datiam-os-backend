import { eq, desc, gte, and } from 'drizzle-orm';
import { db } from '../../db';
import {
  sync_intelligence,
  sync_intelligence_jobs,
  audio_dna,
  audio_uploads,
} from '../../db/schema';
import type { SyncScoreResult, SyncCategory } from './sync-intelligence.types';
import { SYNC_ANALYZER_VERSION } from './sync-intelligence.types';

// ── Job lifecycle ─────────────────────────────────────────────────────────────

export async function createSyncJob(
  uploadId: string,
): Promise<typeof sync_intelligence_jobs.$inferSelect> {
  const [job] = await db
    .insert(sync_intelligence_jobs)
    .values({ upload_id: uploadId, status: 'pending' })
    .returning();
  return job;
}

export async function markSyncJobStarted(jobDbId: string, queueJobId: string): Promise<void> {
  await db
    .update(sync_intelligence_jobs)
    .set({ status: 'processing', queue_job_id: queueJobId, started_at: new Date() })
    .where(eq(sync_intelligence_jobs.id, jobDbId))
    .catch(err => console.error('[SyncRepo] markSyncJobStarted failed:', err instanceof Error ? err.message : err));
}

export async function markSyncJobDone(
  jobDbId: string,
  status: 'completed' | 'failed',
  errorMessage?: string,
): Promise<void> {
  await db
    .update(sync_intelligence_jobs)
    .set({
      status,
      error_message: errorMessage ?? null,
      completed_at:  status === 'completed' ? new Date() : null,
    })
    .where(eq(sync_intelligence_jobs.id, jobDbId))
    .catch(err => console.error('[SyncRepo] markSyncJobDone failed:', err instanceof Error ? err.message : err));
}

// ── Reads used by service/worker ─────────────────────────────────────────────

export async function getUploadForSync(uploadId: string) {
  const [upload] = await db
    .select()
    .from(audio_uploads)
    .where(eq(audio_uploads.id, uploadId))
    .limit(1);
  return upload ?? null;
}

export async function getDnaForSync(uploadId: string) {
  const [dna] = await db
    .select()
    .from(audio_dna)
    .where(eq(audio_dna.upload_id, uploadId))
    .limit(1);
  return dna ?? null;
}

// ── Upsert sync intelligence result ──────────────────────────────────────────

export async function saveSyncResult(
  uploadId: string,
  artistId: string | null,
  result:   SyncScoreResult,
): Promise<void> {
  const s = result.scores;
  const p = (cat: SyncCategory) => String(s[cat].score);
  const c = (cat: SyncCategory) => String(s[cat].confidence);

  const values = {
    film_trailer:   p('film_trailer'),
    netflix_drama:  p('netflix_drama'),
    documentary:    p('documentary'),
    sports_content: p('sports_content'),
    gaming:         p('gaming'),
    fashion:        p('fashion'),
    luxury_brands:  p('luxury_brands'),
    travel_campaigns: p('travel_campaigns'),
    commercial_ads:   p('commercial_ads'),
    social_content:   p('social_content'),

    film_trailer_confidence:   c('film_trailer'),
    netflix_drama_confidence:  c('netflix_drama'),
    documentary_confidence:    c('documentary'),
    sports_content_confidence: c('sports_content'),
    gaming_confidence:         c('gaming'),
    fashion_confidence:        c('fashion'),
    luxury_brands_confidence:  c('luxury_brands'),
    travel_confidence:         c('travel_campaigns'),
    commercial_confidence:     c('commercial_ads'),
    social_confidence:         c('social_content'),

    top_categories:     result.topCategories,
    sync_tags:          result.syncTags,
    placement_notes:    result.placementNotes,
    overall_sync_score: String(result.overallSyncScore),

    analyzer_version:   SYNC_ANALYZER_VERSION,
    processing_time_ms: result.processingTimeMs,
    updated_at:         new Date(),
  };

  await db.transaction(async (tx) => {
    const existing = await tx
      .select({ id: sync_intelligence.id })
      .from(sync_intelligence)
      .where(eq(sync_intelligence.upload_id, uploadId))
      .limit(1);

    if (existing.length > 0) {
      await tx.update(sync_intelligence).set(values).where(eq(sync_intelligence.upload_id, uploadId));
    } else {
      await tx.insert(sync_intelligence).values({ upload_id: uploadId, artist_id: artistId, ...values });
    }
  });
}

// ── Query helpers ────────────────────────────────────────────────────────────

export async function getSyncResult(uploadId: string) {
  const [intel] = await db
    .select()
    .from(sync_intelligence)
    .where(eq(sync_intelligence.upload_id, uploadId))
    .limit(1);

  if (!intel) return null;

  const jobs = await db
    .select()
    .from(sync_intelligence_jobs)
    .where(eq(sync_intelligence_jobs.upload_id, uploadId))
    .orderBy(desc(sync_intelligence_jobs.created_at))
    .limit(3);

  return { intel, jobs };
}

export async function getLatestSyncJob(uploadId: string) {
  const [job] = await db
    .select()
    .from(sync_intelligence_jobs)
    .where(eq(sync_intelligence_jobs.upload_id, uploadId))
    .orderBy(desc(sync_intelligence_jobs.created_at))
    .limit(1);
  return job ?? null;
}

export async function getSyncByArtist(artistId: string, limit = 20) {
  return db
    .select()
    .from(sync_intelligence)
    .where(eq(sync_intelligence.artist_id, artistId))
    .orderBy(desc(sync_intelligence.overall_sync_score))
    .limit(limit);
}

export async function getTopSyncOpportunities(artistId: string, minScore = 60, limit = 10) {
  return db
    .select({
      id:               sync_intelligence.id,
      upload_id:        sync_intelligence.upload_id,
      overall:          sync_intelligence.overall_sync_score,
      top_categories:   sync_intelligence.top_categories,
      sync_tags:        sync_intelligence.sync_tags,
      placement_notes:  sync_intelligence.placement_notes,
      film_trailer:     sync_intelligence.film_trailer,
      sports_content:   sync_intelligence.sports_content,
      social_content:   sync_intelligence.social_content,
      created_at:       sync_intelligence.created_at,
      file_name:        audio_uploads.file_name,
    })
    .from(sync_intelligence)
    .innerJoin(audio_uploads, eq(sync_intelligence.upload_id, audio_uploads.id))
    .where(
      and(
        eq(sync_intelligence.artist_id, artistId),
        gte(sync_intelligence.overall_sync_score, String(minScore)),
      ),
    )
    .orderBy(desc(sync_intelligence.overall_sync_score))
    .limit(limit);
}

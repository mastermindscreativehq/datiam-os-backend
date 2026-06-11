import { eq, desc } from 'drizzle-orm';
import { db } from '../../db';
import {
  audio_dna,
  audio_dna_jobs,
  audio_uploads,
  audio_analysis,
  energy_analysis,
} from '../../db/schema';
import { AppError } from '../../middleware/errorHandler';
import { logActivity } from '../../lib/activityLogger';
import type { DnaResult } from './audio-dna.schema';
import { DNA_ANALYZER_VERSION } from './audio-dna.schema';

// ── Job management ────────────────────────────────────────────────────────────

export async function createDnaJob(
  uploadId: string,
): Promise<typeof audio_dna_jobs.$inferSelect> {
  const [job] = await db
    .insert(audio_dna_jobs)
    .values({ upload_id: uploadId, status: 'pending' })
    .returning();
  return job;
}

export async function markDnaJobStarted(jobDbId: string, queueJobId: string): Promise<void> {
  await db
    .update(audio_dna_jobs)
    .set({ status: 'processing', queue_job_id: queueJobId, started_at: new Date() })
    .where(eq(audio_dna_jobs.id, jobDbId))
    .catch(err => console.error('[DnaService] markDnaJobStarted failed:', err instanceof Error ? err.message : err));
}

export async function markDnaJobDone(
  jobDbId: string,
  status: 'completed' | 'failed',
  errorMessage?: string,
): Promise<void> {
  await db
    .update(audio_dna_jobs)
    .set({
      status,
      error_message: errorMessage ?? null,
      completed_at:  status === 'completed' ? new Date() : null,
    })
    .where(eq(audio_dna_jobs.id, jobDbId))
    .catch(err => console.error('[DnaService] markDnaJobDone failed:', err instanceof Error ? err.message : err));
}

// ── Upload + analysis lookup ──────────────────────────────────────────────────

export async function getUploadWithAnalysis(uploadId: string): Promise<{
  upload:   typeof audio_uploads.$inferSelect;
  analysis: typeof audio_analysis.$inferSelect | null;
  energy:   typeof energy_analysis.$inferSelect | null;
}> {
  const [upload] = await db
    .select()
    .from(audio_uploads)
    .where(eq(audio_uploads.id, uploadId))
    .limit(1);

  if (!upload) throw new AppError('Upload not found', 404, 'UPLOAD_NOT_FOUND');

  const [analysis = null] = await db
    .select()
    .from(audio_analysis)
    .where(eq(audio_analysis.upload_id, uploadId))
    .limit(1);

  const [energy = null] = await db
    .select()
    .from(energy_analysis)
    .where(eq(energy_analysis.upload_id, uploadId))
    .limit(1);

  return { upload, analysis, energy };
}

// ── Save DNA results (upsert) ─────────────────────────────────────────────────

export async function saveDnaResult(
  uploadId: string,
  artistId: string | null,
  result:   DnaResult,
): Promise<void> {
  const values = {
    primary_genre:    result.primaryGenre,
    secondary_genre:  result.secondaryGenre ?? null,
    genre_confidence: String(result.genreConfidence),
    genre_tags:       result.genreTags,

    mood_primary:   result.moodPrimary,
    mood_secondary: result.moodSecondary ?? null,
    mood_profile:   result.moodProfile,

    emotional_fingerprint: result.emotionalFingerprint,
    sonic_fingerprint:     result.sonicFingerprint,
    energy_fingerprint:    result.energyFingerprint,

    danceability: String(result.danceability),
    brightness:   String(result.brightness),
    warmth:       String(result.warmth),
    darkness:     String(result.darkness),
    aggression:   String(result.aggression),
    spirituality: String(result.spirituality),
    romance:      String(result.romance),
    triumph:      String(result.triumph),
    melancholy:   String(result.melancholy),
    tension:      String(result.tension),

    analyzer_version:   DNA_ANALYZER_VERSION,
    processing_time_ms: result.processingTimeMs,
    updated_at:         new Date(),
  };

  await db.transaction(async (tx) => {
    const existing = await tx
      .select({ id: audio_dna.id })
      .from(audio_dna)
      .where(eq(audio_dna.upload_id, uploadId))
      .limit(1);

    if (existing.length > 0) {
      await tx.update(audio_dna).set(values).where(eq(audio_dna.upload_id, uploadId));
    } else {
      await tx.insert(audio_dna).values({ upload_id: uploadId, artist_id: artistId, ...values });
    }
  });

  logActivity({
    eventType:   'audio_dna.analysis.complete',
    module:      'audio-dna',
    title:       `Audio DNA: ${result.primaryGenre} — ${result.moodPrimary}`,
    description: `Genre: ${result.primaryGenre} (${result.genreConfidence}%) | Mood: ${result.moodPrimary} | Dance: ${result.danceability} | Brightness: ${result.brightness}`,
    metadata:    { upload_id: uploadId, artist_id: artistId, primary_genre: result.primaryGenre },
  });
}

// ── Read ──────────────────────────────────────────────────────────────────────

export async function getDnaResult(uploadId: string) {
  const [dna] = await db
    .select()
    .from(audio_dna)
    .where(eq(audio_dna.upload_id, uploadId))
    .limit(1);

  if (!dna) return null;

  const jobs = await db
    .select()
    .from(audio_dna_jobs)
    .where(eq(audio_dna_jobs.upload_id, uploadId))
    .orderBy(desc(audio_dna_jobs.created_at))
    .limit(3);

  return { dna, jobs };
}

export async function getLatestDnaJob(
  uploadId: string,
): Promise<typeof audio_dna_jobs.$inferSelect | null> {
  const [job] = await db
    .select()
    .from(audio_dna_jobs)
    .where(eq(audio_dna_jobs.upload_id, uploadId))
    .orderBy(desc(audio_dna_jobs.created_at))
    .limit(1);
  return job ?? null;
}

export async function getDnaByArtist(artistId: string, limit = 20) {
  return db
    .select()
    .from(audio_dna)
    .where(eq(audio_dna.artist_id, artistId))
    .orderBy(desc(audio_dna.created_at))
    .limit(limit);
}

import { v4 as uuidv4 } from 'uuid';
import { eq, desc } from 'drizzle-orm';
import { db } from '../../db';
import {
  audio_uploads,
  audio_analysis,
  audio_jobs,
  audio_stems,
  waveform_cache,
  artist_profiles,
} from '../../db/schema';
import { AppError } from '../../middleware/errorHandler';
import { uploadAudioFile, getSignedUrl } from './audio.storage';
import { logActivity } from '../../lib/activityLogger';
import { ALLOWED_AUDIO_MIME_TYPES, MAX_AUDIO_FILE_SIZE } from './audio.schema';
import { createSongCore } from '../catalog-engine/songs.service';
import type { FFmpegAnalysisResult } from './audio.processor';
import type { AudioAIProfile } from './audio.ai';

// An uploaded file is always the audio for some Song — every downstream AI
// pipeline (audio_analysis, audio_dna, energy_analysis, sync_intelligence)
// is keyed off audio_uploads.song_id, so a NULL song_id here leaves that
// upload's analysis unreachable from the song it belongs to. If the caller
// doesn't pass an existing songId, create a minimal draft Song from the
// filename so the link always exists; the artist can rename/complete it later.
const titleFromFileName = (fileName: string) =>
  fileName.replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' ').trim() || 'Untitled Upload';

export function validateAudioFile(
  size: number,
  mimeType: string,
): void {
  if (!(ALLOWED_AUDIO_MIME_TYPES as readonly string[]).includes(mimeType)) {
    throw new AppError(`Unsupported file type: ${mimeType}`, 400, 'INVALID_FILE_TYPE');
  }
  if (size > MAX_AUDIO_FILE_SIZE) {
    throw new AppError(
      `File too large: ${(size / 1024 / 1024).toFixed(1)}MB (max 500MB)`,
      400,
      'FILE_TOO_LARGE',
    );
  }
  if (size === 0) {
    throw new AppError('Empty file', 400, 'EMPTY_FILE');
  }
}

export async function initiateUpload(
  artistId: string,
  file: Express.Multer.File,
  songId?: string,
): Promise<typeof audio_uploads.$inferSelect> {
  console.log('[Upload] initiateUpload start', {
    artistId,
    fileName: file.originalname,
    fileSize: file.size,
    mimeType: file.mimetype,
  });

  const [artist] = await db
    .select({ id: artist_profiles.id })
    .from(artist_profiles)
    .where(eq(artist_profiles.id, artistId))
    .limit(1);

  console.log('[Upload] artist lookup:', artist ? 'found' : 'NOT FOUND');
  if (!artist) throw new AppError('Artist not found', 404, 'ARTIST_NOT_FOUND');

  validateAudioFile(file.size, file.mimetype);
  console.log('[Upload] file validation passed');

  let resolvedSongId = songId ?? null;
  if (!resolvedSongId) {
    try {
      const song = await createSongCore({
        artist_id: artistId,
        title: titleFromFileName(file.originalname),
        release_status: 'draft',
      });
      resolvedSongId = song.id;
      console.log('[Upload] auto-created draft song', { songId: song.id });
    } catch (err) {
      const e = err as Error;
      console.error('[Upload] auto-create song FAILED (upload proceeds unlinked):', {
        message: e.message,
        artistId,
        fileName: file.originalname,
      });
    }
  }

  const sessionId = uuidv4();
  const safeName = file.originalname.replace(/[^a-zA-Z0-9._\-]/g, '_');
  const storagePath = `${artistId}/${sessionId}/${safeName}`;

  console.log('[Upload] calling uploadAudioFile', { storagePath });
  let storageUrl: string;
  try {
    storageUrl = await uploadAudioFile(file.buffer, storagePath, file.mimetype);
  } catch (err) {
    const e = err as Error;
    console.error('[Upload] uploadAudioFile FAILED:', {
      message: e.message,
      stack: e.stack,
      storagePath,
      fileName: file.originalname,
      fileSize: file.size,
    });
    throw err;
  }
  console.log('[Upload] Supabase storage OK', { storageUrl });

  let upload: typeof audio_uploads.$inferSelect;
  try {
    const rows = await db
      .insert(audio_uploads)
      .values({
        session_id: sessionId,
        artist_id: artistId,
        song_id: resolvedSongId,
        file_name: file.originalname,
        file_size: file.size,
        mime_type: file.mimetype,
        storage_path: storagePath,
        storage_url: storageUrl,
        status: 'pending',
      })
      .returning();
    [upload] = rows;
  } catch (err) {
    const e = err as Error;
    console.error('[Upload] DB insert audio_uploads FAILED:', {
      message: e.message,
      stack: e.stack,
      artistId,
      sessionId,
      storagePath,
    });
    throw err;
  }
  console.log('[Upload] DB insert OK', { uploadId: upload.id });

  logActivity({
    eventType: 'audio.upload.initiated',
    module: 'audio',
    title: `Audio uploaded: ${file.originalname}`,
    description: `${(file.size / 1024 / 1024).toFixed(1)}MB — ${file.mimetype}`,
    metadata: { upload_id: upload.id, artist_id: artistId, session_id: sessionId },
  });

  return upload;
}

export async function uploadStem(
  uploadId: string,
  artistId: string,
  stemType: string,
  file: Express.Multer.File,
): Promise<typeof audio_stems.$inferSelect> {
  const upload = await getUpload(uploadId);
  if (upload.artist_id !== artistId) throw new AppError('Forbidden', 403);

  validateAudioFile(file.size, file.mimetype);

  const safeName = file.originalname.replace(/[^a-zA-Z0-9._\-]/g, '_');
  const storagePath = `${artistId}/${uploadId}/stems/${stemType}_${safeName}`;
  const storageUrl = await uploadAudioFile(file.buffer, storagePath, file.mimetype);

  const [stem] = await db
    .insert(audio_stems)
    .values({
      upload_id: uploadId,
      artist_id: artistId,
      stem_type: stemType,
      file_name: file.originalname,
      file_size: file.size,
      storage_path: storagePath,
      storage_url: storageUrl,
    })
    .returning();

  return stem;
}

export async function getUpload(
  uploadId: string,
): Promise<typeof audio_uploads.$inferSelect> {
  const [upload] = await db
    .select()
    .from(audio_uploads)
    .where(eq(audio_uploads.id, uploadId))
    .limit(1);
  if (!upload) throw new AppError('Upload not found', 404, 'UPLOAD_NOT_FOUND');
  return upload;
}

export async function getUploadAnalysis(uploadId: string) {
  const upload = await getUpload(uploadId);

  const [analysis] = await db
    .select()
    .from(audio_analysis)
    .where(eq(audio_analysis.upload_id, uploadId))
    .limit(1);

  const [waveform] = await db
    .select()
    .from(waveform_cache)
    .where(eq(waveform_cache.upload_id, uploadId))
    .limit(1);

  const jobs = await db
    .select()
    .from(audio_jobs)
    .where(eq(audio_jobs.upload_id, uploadId))
    .orderBy(desc(audio_jobs.created_at));

  const stems = await db
    .select()
    .from(audio_stems)
    .where(eq(audio_stems.upload_id, uploadId));

  return {
    upload,
    analysis: analysis ?? null,
    waveform: waveform ?? null,
    jobs,
    stems,
  };
}

export async function getArtistUploads(artistId: string, limit = 20) {
  return db
    .select()
    .from(audio_uploads)
    .where(eq(audio_uploads.artist_id, artistId))
    .orderBy(desc(audio_uploads.created_at))
    .limit(limit);
}

export async function markUploadProcessing(uploadId: string): Promise<void> {
  await db
    .update(audio_uploads)
    .set({ status: 'processing', updated_at: new Date() })
    .where(eq(audio_uploads.id, uploadId));
}

export async function markUploadFailed(uploadId: string, error: string): Promise<void> {
  await db
    .update(audio_uploads)
    .set({ status: 'failed', updated_at: new Date() })
    .where(eq(audio_uploads.id, uploadId));

  logActivity({
    eventType: 'audio.processing.failed',
    module: 'audio',
    title: 'Audio processing failed',
    description: error,
    severity: 'error',
    metadata: { upload_id: uploadId },
  });
}

export async function saveAnalysisResult(
  uploadId: string,
  artistId: string | null,
  ffmpeg: FFmpegAnalysisResult,
  ai: AudioAIProfile | null,
): Promise<void> {
  await db.transaction(async (tx) => {
    // Upsert analysis
    const existing = await tx
      .select({ id: audio_analysis.id })
      .from(audio_analysis)
      .where(eq(audio_analysis.upload_id, uploadId))
      .limit(1);

    if (existing.length > 0) {
      await tx
        .update(audio_analysis)
        .set({
          bpm: ffmpeg.bpm?.toString() ?? null,
          duration_seconds: ffmpeg.duration_seconds.toString(),
          loudness_lufs: ffmpeg.loudness_lufs?.toString() ?? null,
          peak_db: ffmpeg.peak_db?.toString() ?? null,
          sample_rate: ffmpeg.sample_rate,
          bit_rate: ffmpeg.bit_rate,
          channels: ffmpeg.channels,
          format: ffmpeg.format,
          emotional_profile: ai?.emotional_profile ?? null,
          cinematic_score: ai?.cinematic_score?.toString() ?? null,
          sync_categories: ai?.sync_categories ?? null,
          genre_confidence: ai?.genre_confidence ?? null,
          vocal_intensity: ai?.vocal_intensity?.toString() ?? null,
          replay_score: ai?.replay_score?.toString() ?? null,
          trailer_suitability: ai?.trailer_suitability?.toString() ?? null,
          ai_notes: ai?.ai_notes ?? null,
        })
        .where(eq(audio_analysis.upload_id, uploadId));
    } else {
      await tx.insert(audio_analysis).values({
        upload_id: uploadId,
        artist_id: artistId,
        bpm: ffmpeg.bpm?.toString() ?? null,
        duration_seconds: ffmpeg.duration_seconds.toString(),
        loudness_lufs: ffmpeg.loudness_lufs?.toString() ?? null,
        peak_db: ffmpeg.peak_db?.toString() ?? null,
        sample_rate: ffmpeg.sample_rate,
        bit_rate: ffmpeg.bit_rate,
        channels: ffmpeg.channels,
        format: ffmpeg.format,
        emotional_profile: ai?.emotional_profile ?? null,
        cinematic_score: ai?.cinematic_score?.toString() ?? null,
        sync_categories: ai?.sync_categories ?? null,
        genre_confidence: ai?.genre_confidence ?? null,
        vocal_intensity: ai?.vocal_intensity?.toString() ?? null,
        replay_score: ai?.replay_score?.toString() ?? null,
        trailer_suitability: ai?.trailer_suitability?.toString() ?? null,
        ai_notes: ai?.ai_notes ?? null,
      });
    }

    // Upsert waveform
    const existingWaveform = await tx
      .select({ id: waveform_cache.id })
      .from(waveform_cache)
      .where(eq(waveform_cache.upload_id, uploadId))
      .limit(1);

    if (existingWaveform.length > 0) {
      await tx
        .update(waveform_cache)
        .set({
          waveform_data: ffmpeg.waveform_data,
          sample_count: ffmpeg.waveform_data.length,
          duration_seconds: ffmpeg.duration_seconds.toString(),
          generated_at: new Date(),
        })
        .where(eq(waveform_cache.upload_id, uploadId));
    } else {
      await tx.insert(waveform_cache).values({
        upload_id: uploadId,
        waveform_data: ffmpeg.waveform_data,
        sample_count: ffmpeg.waveform_data.length,
        duration_seconds: ffmpeg.duration_seconds.toString(),
      });
    }

    await tx
      .update(audio_uploads)
      .set({
        status: 'analyzed',
        duration_seconds: ffmpeg.duration_seconds.toString(),
        updated_at: new Date(),
      })
      .where(eq(audio_uploads.id, uploadId));
  });

  logActivity({
    eventType: 'audio.analysis.complete',
    module: 'audio',
    title: 'Audio analysis complete',
    description: `BPM: ${ffmpeg.bpm ?? 'N/A'} | Duration: ${ffmpeg.duration_seconds.toFixed(1)}s | LUFS: ${ffmpeg.loudness_lufs ?? 'N/A'}`,
    metadata: { upload_id: uploadId, artist_id: artistId, has_ai: ai !== null },
  });
}

export async function createJobRecord(
  uploadId: string,
  jobType: string,
  payload: Record<string, unknown> = {},
): Promise<typeof audio_jobs.$inferSelect> {
  const [job] = await db
    .insert(audio_jobs)
    .values({
      upload_id: uploadId,
      queue_name: 'audio-processing',
      job_type: jobType,
      status: 'pending',
      payload,
    })
    .returning();
  return job;
}

export async function updateJobRecord(
  jobId: string,
  updates: Partial<{
    job_id: string;
    status: string;
    attempts: number;
    error: string;
    completed_at: Date;
  }>,
): Promise<void> {
  await db.update(audio_jobs).set(updates).where(eq(audio_jobs.id, jobId));
}

export async function getUploadSignedUrl(uploadId: string): Promise<string> {
  const upload = await getUpload(uploadId);
  return getSignedUrl(upload.storage_path);
}

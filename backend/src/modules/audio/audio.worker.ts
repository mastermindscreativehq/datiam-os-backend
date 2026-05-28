import { Worker, Job } from 'bullmq';
import { eq } from 'drizzle-orm';
import { db } from '../../db';
import { audio_jobs } from '../../db/schema';
import { getRedisConnection } from '../../queues';
import { processAudioFromUrl, verifyFfmpegBinaries } from './audio.processor';
import { runAISonicAnalysis } from './audio.ai';
import {
  getUpload,
  getUploadSignedUrl,
  saveAnalysisResult,
  markUploadProcessing,
  markUploadFailed,
} from './audio.service';

let audioWorker: Worker | null = null;

async function markJobStatus(
  bullJobId: string,
  status: string,
  extra: { error?: string; completed_at?: Date } = {},
): Promise<void> {
  await db
    .update(audio_jobs)
    .set({ status, ...extra })
    .where(eq(audio_jobs.job_id, bullJobId))
    .catch(() => {});
}

async function processJob(job: Job): Promise<void> {
  const { upload_id } = job.data as { upload_id: string };

  console.log(`[AudioWorker] Processing job=${job.id} upload=${upload_id}`);

  await markJobStatus(job.id ?? '', 'processing');
  await markUploadProcessing(upload_id);

  const upload = await getUpload(upload_id);
  const signedUrl = await getUploadSignedUrl(upload_id);

  const ffmpegResult = await processAudioFromUrl(signedUrl, upload.mime_type);

  const aiResult = await runAISonicAnalysis(upload.file_name, {
    bpm: ffmpegResult.bpm,
    duration_seconds: ffmpegResult.duration_seconds,
    loudness_lufs: ffmpegResult.loudness_lufs,
    channels: ffmpegResult.channels,
    format: ffmpegResult.format,
    sample_rate: ffmpegResult.sample_rate,
  });

  await saveAnalysisResult(upload_id, upload.artist_id ?? null, ffmpegResult, aiResult);

  await markJobStatus(job.id ?? '', 'completed', { completed_at: new Date() });
  console.log(`[AudioWorker] Job=${job.id} completed for upload=${upload_id}`);
}

export function startAudioWorker(): void {
  verifyFfmpegBinaries();

  const conn = getRedisConnection();
  if (!conn) {
    console.log('[AudioWorker] Redis not configured — worker not started (graceful degradation)');
    return;
  }

  audioWorker = new Worker('audio-processing', processJob, {
    connection: conn,
    concurrency: 2,
  });

  audioWorker.on('failed', async (job, err) => {
    console.error(`[AudioWorker] Job=${job?.id} failed:`, err.message);
    if (job?.id) await markJobStatus(job.id, 'failed', { error: err.message });
    if (job?.data?.upload_id) await markUploadFailed(job.data.upload_id as string, err.message);
  });

  audioWorker.on('error', (err) => {
    console.warn('[AudioWorker] Worker error:', err.message);
  });

  console.log('[AudioWorker] Started: audio-processing (concurrency=2)');
}

export async function stopAudioWorker(): Promise<void> {
  await audioWorker?.close();
  console.log('[AudioWorker] Stopped');
}

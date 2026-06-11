import { Worker, Job } from 'bullmq';
import { createWorkerConnection } from '../../queues';
import {
  getUploadWithAnalysis,
  saveDnaResult,
  markDnaJobStarted,
  markDnaJobDone,
} from './audio-dna.service';
import { computeAudioDna, type EnergyContext } from './audio-dna.analyzer';

let dnaWorker: Worker | null = null;

async function processDnaJob(job: Job): Promise<void> {
  const { upload_id, job_db_id } = job.data as { upload_id: string; job_db_id: string };

  console.log(`[DnaWorker] Processing job=${job.id} upload=${upload_id}`);
  await markDnaJobStarted(job_db_id, job.id ?? '');

  const { upload, analysis, energy } = await getUploadWithAnalysis(upload_id);

  if (!analysis) {
    throw new Error(`No audio analysis found for upload ${upload_id} — run audio processing first`);
  }

  const energyCtx: EnergyContext | null = energy
    ? {
        energyArc:        energy.energy_arc,
        peakMoment:       energy.peak_moment,
        dropStrength:     energy.drop_strength    ? parseFloat(String(energy.drop_strength))    : 50,
        energyVolatility: energy.energy_volatility ? parseFloat(String(energy.energy_volatility)) : 50,
        tensionCurve:     energy.tension_curve,
        replayRetention:  energy.replay_retention  ? parseFloat(String(energy.replay_retention))  : 50,
      }
    : null;

  const result = computeAudioDna(analysis, energyCtx);

  await saveDnaResult(upload_id, upload.artist_id ?? null, result);
  await markDnaJobDone(job_db_id, 'completed');

  console.log(
    `[DnaWorker] Job=${job.id} complete — ` +
    `genre=${result.primaryGenre} mood=${result.moodPrimary} ` +
    `dance=${result.danceability} bright=${result.brightness}`,
  );
}

export function startDnaWorker(): void {
  if (!process.env.REDIS_URL) {
    console.log('[DnaWorker] Redis not configured — worker not started (graceful degradation)');
    return;
  }

  dnaWorker = new Worker('audio-dna', processDnaJob, {
    connection:  createWorkerConnection(),
    concurrency: 2,
  });

  dnaWorker.on('failed', async (job, err) => {
    console.error(`[DnaWorker] Job=${job?.id} failed:`, err instanceof Error ? err.stack : err);
    if (job?.data?.job_db_id) {
      await markDnaJobDone(job.data.job_db_id as string, 'failed', err.message);
    }
  });

  dnaWorker.on('error', (err) => {
    console.error('[DnaWorker] Worker error:', err instanceof Error ? err.stack : err);
  });

  console.log('[DnaWorker] Started: audio-dna (concurrency=2)');
}

export async function stopDnaWorker(): Promise<void> {
  await dnaWorker?.close();
  console.log('[DnaWorker] Stopped');
}

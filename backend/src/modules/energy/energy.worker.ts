import { Worker, Job } from 'bullmq';
import { getRedisConnection } from '../../queues';
import { extractEnergyFrames } from './energy.analyzer';
import { detectSections } from './energy.sections';
import { computeEnergyIntelligence, buildEnergyCurve } from './energy.scoring';
import {
  getUploadForEnergy,
  saveEnergyAnalysis,
  markEnergyJobStarted,
  markEnergyJobDone,
} from './energy.service';
import { getSignedUrl } from '../audio/audio.storage';

let energyWorker: Worker | null = null;

async function processEnergyJob(job: Job): Promise<void> {
  const { upload_id, job_db_id } = job.data as {
    upload_id:  string;
    job_db_id:  string;
  };

  console.log(`[EnergyWorker] Processing job=${job.id} upload=${upload_id}`);

  await markEnergyJobStarted(job_db_id, job.id ?? '');

  const upload    = await getUploadForEnergy(upload_id);
  const signedUrl = await getSignedUrl(upload.storage_path);

  console.log(`[EnergyWorker] Decoding + extracting frames for upload=${upload_id}`);
  const rawData = await extractEnergyFrames(signedUrl);

  console.log(
    `[EnergyWorker] Extracted ${rawData.frames.length} frames ` +
    `(${rawData.durationSeconds.toFixed(1)}s) for upload=${upload_id}`,
  );

  const sections    = detectSections(rawData.frames, rawData.durationSeconds);
  const intelligence = computeEnergyIntelligence(rawData.frames, sections);
  const energyCurve  = buildEnergyCurve(rawData.frames);

  await saveEnergyAnalysis(
    upload_id,
    upload.artist_id ?? null,
    intelligence,
    sections,
    energyCurve,
  );

  await markEnergyJobDone(job_db_id, 'completed');

  console.log(
    `[EnergyWorker] Job=${job.id} complete — ` +
    `arc=${intelligence.energyArc} peak=${intelligence.peakMoment} ` +
    `drop=${intelligence.dropStrength} sections=${sections.length}`,
  );
}

export function startEnergyWorker(): void {
  const conn = getRedisConnection();
  if (!conn) {
    console.log('[EnergyWorker] Redis not configured — worker not started (graceful degradation)');
    return;
  }

  energyWorker = new Worker('energy-analysis', processEnergyJob, {
    connection: conn,
    concurrency: 1,
  });

  energyWorker.on('failed', async (job, err) => {
    console.error(`[EnergyWorker] Job=${job?.id} failed:`, err.message);
    if (job?.data?.job_db_id) {
      await markEnergyJobDone(job.data.job_db_id as string, 'failed', err.message);
    }
  });

  energyWorker.on('error', (err) => {
    console.warn('[EnergyWorker] Worker error:', err.message);
  });

  console.log('[EnergyWorker] Started: energy-analysis (concurrency=1)');
}

export async function stopEnergyWorker(): Promise<void> {
  await energyWorker?.close();
  console.log('[EnergyWorker] Stopped');
}

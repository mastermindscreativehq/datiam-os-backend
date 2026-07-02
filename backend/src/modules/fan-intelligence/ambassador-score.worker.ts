import { Worker, Job } from 'bullmq';
import { createWorkerConnection } from '../../queues';
import { fanIntelligenceExtensionService } from './fan-intelligence-extension.service';

let ambassadorWorker: Worker | null = null;

interface AmbassadorScoreJobData {
  fan_id?: string;
  batch_size?: number;
}

async function processAmbassadorScoreJob(job: Job<AmbassadorScoreJobData>): Promise<void> {
  const { fan_id, batch_size } = job.data;

  console.log(`[AmbassadorWorker] Job=${job.id} fan=${fan_id ?? 'batch'}`);

  if (fan_id) {
    const row = await fanIntelligenceExtensionService.recalculateAmbassadorScore(fan_id);
    console.log(`[AmbassadorWorker] Job=${job.id} fan=${fan_id} score updated`);
    return;
  }

  const result = await fanIntelligenceExtensionService.batchRecalculateAmbassadorScores(batch_size ?? 500);
  console.log(`[AmbassadorWorker] Job=${job.id} batch complete — updated ${result.updated} fans`);
}

export function startAmbassadorScoreWorker(): void {
  if (!process.env.REDIS_URL) {
    console.log('[AmbassadorWorker] Redis not configured — worker not started');
    return;
  }

  ambassadorWorker = new Worker('growth-ambassador-score', processAmbassadorScoreJob, {
    connection: createWorkerConnection(),
    concurrency: 2,
  });

  ambassadorWorker.on('failed', (job, err) => {
    console.error(`[AmbassadorWorker] Job=${job?.id} failed:`, err instanceof Error ? err.message : err);
  });

  ambassadorWorker.on('error', (err) => {
    console.error('[AmbassadorWorker] Worker error:', err instanceof Error ? err.stack : err);
  });

  console.log('[AmbassadorWorker] Started: growth-ambassador-score (concurrency=2)');
}

export async function stopAmbassadorScoreWorker(): Promise<void> {
  await ambassadorWorker?.close();
  console.log('[AmbassadorWorker] Stopped');
}

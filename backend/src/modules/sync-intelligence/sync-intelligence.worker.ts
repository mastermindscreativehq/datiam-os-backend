import { Worker, Job } from 'bullmq';
import { createWorkerConnection } from '../../queues';
import {
  processSyncIntelligence,
  markSyncJobStarted,
  markSyncJobDone,
} from './sync-intelligence.service';

let syncWorker: Worker | null = null;

async function processSyncJob(job: Job): Promise<void> {
  const { upload_id, job_db_id } = job.data as { upload_id: string; job_db_id: string };

  console.log(`[SyncWorker] Processing job=${job.id} upload=${upload_id}`);
  await markSyncJobStarted(job_db_id, job.id ?? '');

  const result = await processSyncIntelligence(upload_id);

  await markSyncJobDone(job_db_id, 'completed');

  console.log(
    `[SyncWorker] Job=${job.id} complete — ` +
    `overall=${result.overallSyncScore} ` +
    `top=${result.topCategories[0] ?? 'none'} ` +
    `tags=${result.syncTags.slice(0, 3).join(',')}`,
  );
}

export function startSyncWorker(): void {
  if (!process.env.REDIS_URL) {
    console.log('[SyncWorker] Redis not configured — worker not started (graceful degradation)');
    return;
  }

  syncWorker = new Worker('sync-intelligence', processSyncJob, {
    connection:  createWorkerConnection(),
    concurrency: 2,
  });

  syncWorker.on('failed', async (job, err) => {
    console.error(`[SyncWorker] Job=${job?.id} failed:`, err instanceof Error ? err.stack : err);
    if (job?.data?.job_db_id) {
      await markSyncJobDone(job.data.job_db_id as string, 'failed', err.message);
    }
  });

  syncWorker.on('error', (err) => {
    console.error('[SyncWorker] Worker error:', err instanceof Error ? err.stack : err);
  });

  console.log('[SyncWorker] Started: sync-intelligence (concurrency=2)');
}

export async function stopSyncWorker(): Promise<void> {
  await syncWorker?.close();
  console.log('[SyncWorker] Stopped');
}

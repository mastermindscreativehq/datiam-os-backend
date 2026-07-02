import { Worker, Job } from 'bullmq';
import { createWorkerConnection } from '../../queues';
import { analyticsHubService } from './analytics-hub.service';

let contentSyncWorker: Worker | null = null;

interface ContentSyncJobData {
  content_id: string;
}

async function processContentSyncJob(job: Job<ContentSyncJobData>): Promise<void> {
  const { content_id } = job.data;

  console.log(`[ContentSyncWorker] Job=${job.id} content=${content_id}`);

  const score = await analyticsHubService.updateContentPerformanceScore(content_id);

  console.log(`[ContentSyncWorker] Job=${job.id} content=${content_id} score=${score ?? 'unchanged'}`);
}

export function startContentSyncWorker(): void {
  if (!process.env.REDIS_URL) {
    console.log('[ContentSyncWorker] Redis not configured — worker not started');
    return;
  }

  contentSyncWorker = new Worker('growth-content-sync', processContentSyncJob, {
    connection: createWorkerConnection(),
    concurrency: 5,
  });

  contentSyncWorker.on('failed', (job, err) => {
    console.error(`[ContentSyncWorker] Job=${job?.id} failed:`, err instanceof Error ? err.message : err);
  });

  contentSyncWorker.on('error', (err) => {
    console.error('[ContentSyncWorker] Worker error:', err instanceof Error ? err.stack : err);
  });

  console.log('[ContentSyncWorker] Started: growth-content-sync (concurrency=5)');
}

export async function stopContentSyncWorker(): Promise<void> {
  await contentSyncWorker?.close();
  console.log('[ContentSyncWorker] Stopped');
}

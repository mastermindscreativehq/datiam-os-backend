import { Worker, Job } from 'bullmq';
import { createWorkerConnection, releaseIntelQueue } from '../../queues';
import { analyzeRelease } from './release-intel.service';

let releaseIntelWorker: Worker | null = null;

async function processReleaseIntelJob(job: Job): Promise<void> {
  const { release_id, force } = job.data as { release_id: string; force?: boolean };
  console.log(`[ReleaseIntelWorker] Processing job=${job.id} release=${release_id}`);
  await analyzeRelease(release_id, { force });
  console.log(`[ReleaseIntelWorker] Job=${job.id} complete`);
}

export function startReleaseIntelWorker(): void {
  if (!process.env.REDIS_URL) {
    console.log('[ReleaseIntelWorker] Redis not configured — worker not started (graceful degradation)');
    return;
  }

  releaseIntelWorker = new Worker('release-intel', processReleaseIntelJob, {
    connection: createWorkerConnection(),
    concurrency: 2,
  });

  releaseIntelWorker.on('failed', (job, err) => {
    console.error(`[ReleaseIntelWorker] Job=${job?.id} failed:`, err instanceof Error ? err.stack : err);
  });

  releaseIntelWorker.on('error', (err) => {
    console.error('[ReleaseIntelWorker] Worker error:', err instanceof Error ? err.stack : err);
  });

  console.log('[ReleaseIntelWorker] Started: release-intel (concurrency=2)');
}

export async function stopReleaseIntelWorker(): Promise<void> {
  await releaseIntelWorker?.close();
  console.log('[ReleaseIntelWorker] Stopped');
}

/**
 * Fires Release Intel analysis for a newly created (or updated) release.
 * Enqueues via BullMQ when Redis is configured; otherwise runs inline as a
 * non-blocking, best-effort fire-and-forget call so the behavior is
 * identical in dev/test (no Redis) and production — callers must never
 * await this on the release-creation hot path.
 */
export function triggerReleaseIntelAnalysis(releaseId: string, opts: { force?: boolean } = {}): void {
  if (releaseIntelQueue) {
    releaseIntelQueue.add('analyze', { release_id: releaseId, force: opts.force }).catch((err) => {
      console.warn('[ReleaseIntel] Failed to enqueue analysis job (non-fatal):', err instanceof Error ? err.message : String(err));
    });
    return;
  }

  analyzeRelease(releaseId, opts).catch((err) => {
    console.warn('[ReleaseIntel] Inline analysis failed (non-fatal):', err instanceof Error ? err.message : String(err));
  });
}

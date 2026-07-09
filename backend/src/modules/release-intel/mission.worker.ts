import { Worker, Job } from 'bullmq';
import { eq } from 'drizzle-orm';
import { createWorkerConnection } from '../../queues';
import { db } from '../../db';
import { release_missions } from '../../db/schema';
import { logActivity } from '../../lib/activityLogger';
import { processMissionJob, type MissionJobPayload } from './mission-dispatcher.service';

// One BullMQ queue/worker per mission_type — see queues/index.ts and
// mission-dispatcher.service.ts::MISSION_WORKFLOW_NAME for the mapping.
const QUEUE_NAMES = ['playlist', 'sync', 'fan', 'content', 'outreach', 'analytics'] as const;

let workers: Worker[] = [];

async function processJob(job: Job): Promise<void> {
  const payload = job.data as MissionJobPayload;
  console.log(`[MissionWorker] Processing job=${job.id} queue=${job.queueName} mission=${payload.missionId} attempt=${job.attemptsMade + 1}`);
  await processMissionJob(payload, job.attemptsMade);
}

export function startMissionWorkers(): void {
  if (!process.env.REDIS_URL) {
    console.log('[MissionWorker] Redis not configured — mission workers not started (graceful degradation)');
    return;
  }

  workers = QUEUE_NAMES.map((queueName) => {
    const worker = new Worker(queueName, processJob, {
      connection: createWorkerConnection(),
      concurrency: 2,
    });

    worker.on('failed', (job, err) => {
      console.error(`[MissionWorker:${queueName}] Job=${job?.id} failed:`, err instanceof Error ? err.stack : err);
      if (!job) return;

      const isFinal = job.attemptsMade >= (job.opts.attempts ?? 1);
      if (!isFinal) return; // BullMQ will retry — mission status flips to 'retrying' on the next attempt

      const { missionId } = job.data as MissionJobPayload;
      const message = err instanceof Error ? err.message : String(err);

      void (async () => {
        try {
          await db
            .update(release_missions)
            .set({ status: 'failed', last_error: message, updated_at: new Date() })
            .where(eq(release_missions.id, missionId));
        } catch (dbErr) {
          console.error(`[MissionWorker:${queueName}] Failed to mark mission ${missionId} as failed:`, dbErr instanceof Error ? dbErr.message : String(dbErr));
        }

        logActivity({
          eventType: 'release_intel.mission.failed',
          module: 'release-intel',
          entityType: 'release_mission',
          entityId: missionId,
          title: 'Mission failed after exhausting all retries',
          severity: 'error',
          metadata: { queue: queueName, attempts: job.attemptsMade, error: message },
        });
      })();
    });

    worker.on('error', (err) => {
      console.error(`[MissionWorker:${queueName}] Worker error:`, err instanceof Error ? err.stack : err);
    });

    console.log(`[MissionWorker] Started: ${queueName} (concurrency=2)`);
    return worker;
  });
}

export async function stopMissionWorkers(): Promise<void> {
  await Promise.all(workers.map((w) => w.close()));
  console.log('[MissionWorker] Stopped');
}

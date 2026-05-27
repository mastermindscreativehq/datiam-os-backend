import { Worker, Job } from 'bullmq';
import { getRedisConnection } from '../../queues';
import { eq } from 'drizzle-orm';
import { db } from '../../db';
import { sonic_queue_jobs, sonic_world_blueprints } from '../../db/schema';
import { analyzeArtistPatterns } from './sonic-patterns.service';
import { computeArtistProfile } from './sonic-artist-profile.service';
import { getArtistRankings } from './sonic-rankings.service';
import { ingestBlueprintMemory } from './sonic-memory.service';
import { simulateRelease } from './sonic-release-simulator.service';
import { sonicEventBus } from './sonic-event-bus';

type WorkerRef = Worker | null;

let simulationWorker:  WorkerRef = null;
let analyticsWorker:   WorkerRef = null;
let memoryWorker:      WorkerRef = null;
let rankingWorker:     WorkerRef = null;

async function markCompleted(jobId: string) {
  await db.update(sonic_queue_jobs)
    .set({ status: 'completed', completed_at: new Date(), attempts: 1 })
    .where(eq(sonic_queue_jobs.job_id, jobId))
    .catch(() => {/* non-fatal */});
}

async function markFailed(jobId: string, error: string) {
  await db.update(sonic_queue_jobs)
    .set({ status: 'failed', error, attempts: 1 })
    .where(eq(sonic_queue_jobs.job_id, jobId))
    .catch(() => {/* non-fatal */});
}

function createWorker(queueName: string, handler: (job: Job) => Promise<void>): Worker {
  const conn = getRedisConnection();
  if (!conn) throw new Error(`[SonicQueue] No Redis connection for queue ${queueName}`);

  const worker = new Worker(queueName, async (job: Job) => {
    try {
      await handler(job);
      await markCompleted(job.id ?? '');
      sonicEventBus.publish('queue.job.completed', { queue: queueName, job_id: job.id, job_type: job.name });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      await markFailed(job.id ?? '', msg);
      throw err;
    }
  }, { connection: conn, concurrency: 2 });

  worker.on('error', err => console.warn(`[SonicQueue:${queueName}] Worker error:`, err.message));
  return worker;
}

export function startSonicWorkers(): void {
  const conn = getRedisConnection();
  if (!conn) {
    console.log('[SonicQueue] Redis not configured — workers not started (graceful degradation)');
    return;
  }

  // ── Release Simulation Worker ────────────────────────────────────────────────
  simulationWorker = createWorker('sonic-simulation', async (job) => {
    const { blueprint_id, artist_id } = job.data as { blueprint_id: string; artist_id: string };
    await simulateRelease(blueprint_id, artist_id);
    sonicEventBus.publish('release.simulated', { artist_id, blueprint_id });
  });

  // ── Analytics Recalculation Worker ───────────────────────────────────────────
  analyticsWorker = createWorker('sonic-analytics', async (job) => {
    const { artist_id } = job.data as { artist_id: string };
    await analyzeArtistPatterns(artist_id);
    await computeArtistProfile(artist_id);
    sonicEventBus.publish('analytics.recalculated', { artist_id });
  });

  // ── Memory Ingestion Worker ──────────────────────────────────────────────────
  memoryWorker = createWorker('sonic-memory', async (job) => {
    const { blueprint_id, artist_id, emotion, intention } = job.data as {
      blueprint_id: string; artist_id: string; emotion: string; intention: string;
    };
    const [blueprint] = await db.select().from(sonic_world_blueprints).where(eq(sonic_world_blueprints.id, blueprint_id)).limit(1);
    if (blueprint) {
      await ingestBlueprintMemory(blueprint, emotion ?? '', intention ?? '');
    }
    sonicEventBus.publish('memory.ingested', { artist_id, blueprint_id });
  });

  // ── Ranking Regeneration Worker ──────────────────────────────────────────────
  rankingWorker = createWorker('sonic-ranking', async (job) => {
    const { artist_id } = job.data as { artist_id: string };
    await getArtistRankings(artist_id);
    sonicEventBus.publish('ranking.regenerated', { artist_id });
  });

  console.log('[SonicQueue] Workers started: simulation, analytics, memory, ranking');
}

export async function stopSonicWorkers(): Promise<void> {
  await Promise.allSettled([
    simulationWorker?.close(),
    analyticsWorker?.close(),
    memoryWorker?.close(),
    rankingWorker?.close(),
  ]);
  console.log('[SonicQueue] Workers stopped');
}

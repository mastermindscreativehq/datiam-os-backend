import IORedis, { RedisOptions } from 'ioredis';
import { Queue } from 'bullmq';

// Railway's *.proxy.rlwy.net is a transparent TCP pass-through proxy — it is NOT a TLS endpoint.
// TLS must only be enabled when the URL scheme is rediss://; adding tls:{} to a redis:// URL
// causes ioredis to send a TLS CLIENT_HELLO to a plain-TCP Redis port → ETIMEDOUT.
// ECONNRESET on Railway proxy is fixed by keepAlive, not TLS.
function buildRedisOpts(url: string): RedisOptions {
  const isTls = url.startsWith('rediss://');
  return {
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
    keepAlive: 30_000,
    connectTimeout: 30_000,
    retryStrategy: (times: number) => Math.min(times * 200, 5_000),
    ...(isTls ? { tls: { rejectUnauthorized: false } } : {}),
  };
}

let redisConnection: IORedis | null = null;

export const getRedisConnection = (): IORedis | null => {
  const redisUrl = process.env.REDIS_URL;
  if (!redisUrl) return null;

  if (!redisConnection) {
    redisConnection = new IORedis(redisUrl, buildRedisOpts(redisUrl));
    redisConnection.on('connect', () => console.log('[Redis] CONNECTED'));
    redisConnection.on('ready',   () => console.log('[Redis] READY'));
    redisConnection.on('error',   (err) => console.warn('[Redis] ERROR:', err.message));
  }

  return redisConnection;
};

/**
 * Returns a fresh, dedicated IORedis connection.
 * BullMQ Workers must NOT share the queue producer connection — each Worker
 * needs its own socket so that blocking commands and regular operations don't
 * contend, and a single connection failure doesn't cascade across all workers.
 */
export const createWorkerConnection = (): IORedis => {
  const redisUrl = process.env.REDIS_URL;
  if (!redisUrl) throw new Error('[Redis] REDIS_URL is not set');
  const conn = new IORedis(redisUrl, buildRedisOpts(redisUrl));
  conn.on('error', (err) => console.warn('[Redis:worker] ERROR:', err.message));
  return conn;
};

const QUEUE_DEFAULTS = {
  attempts: 3,
  backoff: { type: 'exponential' as const, delay: 2000 },
  removeOnComplete: { count: 100 },
  removeOnFail:     { count: 500 },
};

const createQueue = (name: string): Queue | null => {
  const conn = getRedisConnection();
  if (!conn) return null;
  return new Queue(name, {
    connection: conn,
    defaultJobOptions: QUEUE_DEFAULTS,
  });
};

// Queue instances — null if Redis is not configured
export const automationQueue     = process.env.REDIS_URL ? createQueue('automation')         : null;
export const notificationQueue   = process.env.REDIS_URL ? createQueue('notifications')      : null;

// Sonic World Phase 5 queues
export const sonicSimulationQueue = process.env.REDIS_URL ? createQueue('sonic-simulation')  : null;
export const sonicAnalyticsQueue  = process.env.REDIS_URL ? createQueue('sonic-analytics')   : null;
export const sonicMemoryQueue     = process.env.REDIS_URL ? createQueue('sonic-memory')       : null;
export const sonicRankingQueue    = process.env.REDIS_URL ? createQueue('sonic-ranking')      : null;

// Audio Pipeline Phase 6
export const audioProcessingQueue = process.env.REDIS_URL ? createQueue('audio-processing')  : null;

// Energy Intelligence Engine Phase 7
export const energyAnalysisQueue   = process.env.REDIS_URL ? createQueue('energy-analysis')   : null;

// DATIAM Intelligence Phase 1
export const audioDnaQueue          = process.env.REDIS_URL ? createQueue('audio-dna')          : null;
export const syncIntelligenceQueue  = process.env.REDIS_URL ? createQueue('sync-intelligence')  : null;

// Release Intel — orchestration layer triggered on release creation
export const releaseIntelQueue      = process.env.REDIS_URL ? createQueue('release-intel')      : null;

// Growth OS queues
export const growthPublishQueue       = process.env.REDIS_URL ? createQueue('growth-publish')       : null;
export const growthAnalyticsSyncQueue = process.env.REDIS_URL ? createQueue('growth-analytics-sync') : null;
export const growthTrendScanQueue     = process.env.REDIS_URL ? createQueue('growth-trend-scan')    : null;
export const growthAmbassadorQueue    = process.env.REDIS_URL ? createQueue('growth-ambassador-score') : null;
export const growthAIGenerationQueue  = process.env.REDIS_URL ? createQueue('growth-ai-generation')  : null;
export const growthContentSyncQueue   = process.env.REDIS_URL ? createQueue('growth-content-sync')   : null;

// Release Intel Mission Dispatcher — one queue per mission type (playlist,
// sync, fan_growth, content, outreach, analytics). Each mission created by
// Release Intel is enqueued onto the queue matching its mission_type, picked
// up by the matching worker in modules/release-intel/mission.worker.ts, and
// dispatched to n8n via the existing automation registry.
export const missionPlaylistQueue  = process.env.REDIS_URL ? createQueue('playlist')  : null;
export const missionSyncQueue      = process.env.REDIS_URL ? createQueue('sync')      : null;
export const missionFanQueue       = process.env.REDIS_URL ? createQueue('fan')       : null;
export const missionContentQueue   = process.env.REDIS_URL ? createQueue('content')   : null;
export const missionOutreachQueue  = process.env.REDIS_URL ? createQueue('outreach')  : null;
export const missionAnalyticsQueue = process.env.REDIS_URL ? createQueue('analytics') : null;

export async function enqueueGrowthJob(
  queue: ReturnType<typeof createQueue>,
  jobName: string,
  data: Record<string, unknown>,
  opts?: { delay?: number; priority?: number },
): Promise<string | null> {
  if (!queue) return null;
  const job = await queue.add(jobName, data, { ...QUEUE_DEFAULTS, ...opts });
  return job.id ?? null;
}

export async function enqueueSonicJob(
  queue: ReturnType<typeof createQueue>,
  jobName: string,
  data: Record<string, unknown>,
): Promise<string | null> {
  if (!queue) return null;
  const job = await queue.add(jobName, data, { ...QUEUE_DEFAULTS });
  return job.id ?? null;
}

export async function enqueueAudioJob(
  queue: ReturnType<typeof createQueue>,
  jobName: string,
  data: Record<string, unknown>,
): Promise<string | null> {
  if (!queue) return null;
  const job = await queue.add(jobName, data, { ...QUEUE_DEFAULTS, backoff: { type: 'exponential', delay: 5000 } });
  return job.id ?? null;
}

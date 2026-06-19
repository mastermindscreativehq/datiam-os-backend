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

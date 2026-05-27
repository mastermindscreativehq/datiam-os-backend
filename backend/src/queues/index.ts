import IORedis from 'ioredis';
import { Queue } from 'bullmq';

let redisConnection: IORedis | null = null;

export const getRedisConnection = (): IORedis | null => {
  const redisUrl = process.env.REDIS_URL;
  if (!redisUrl) return null;

  if (!redisConnection) {
    redisConnection = new IORedis(redisUrl, {
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
    });

    redisConnection.on('error', (err) => {
      console.warn('[Redis] Connection error:', err.message);
    });
  }

  return redisConnection;
};

const createQueue = (name: string): Queue | null => {
  const conn = getRedisConnection();
  if (!conn) return null;
  return new Queue(name, { connection: conn });
};

// Queue instances — null if Redis is not configured
export const automationQueue     = process.env.REDIS_URL ? createQueue('automation')         : null;
export const notificationQueue   = process.env.REDIS_URL ? createQueue('notifications')      : null;

// Sonic World Phase 5 queues
export const sonicSimulationQueue = process.env.REDIS_URL ? createQueue('sonic-simulation')  : null;
export const sonicAnalyticsQueue  = process.env.REDIS_URL ? createQueue('sonic-analytics')   : null;
export const sonicMemoryQueue     = process.env.REDIS_URL ? createQueue('sonic-memory')       : null;
export const sonicRankingQueue    = process.env.REDIS_URL ? createQueue('sonic-ranking')      : null;

export async function enqueueSonicJob(
  queue: ReturnType<typeof createQueue>,
  jobName: string,
  data: Record<string, unknown>,
): Promise<string | null> {
  if (!queue) return null;
  const job = await queue.add(jobName, data, { attempts: 3, backoff: { type: 'exponential', delay: 2000 } });
  return job.id ?? null;
}

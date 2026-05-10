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
export const automationQueue = process.env.REDIS_URL ? createQueue('automation') : null;
export const notificationQueue = process.env.REDIS_URL ? createQueue('notifications') : null;

import { Worker, Job } from 'bullmq';
import { createWorkerConnection } from '../../queues';
import { publishingEngineService } from './publishing-engine.service';
import { notificationService } from '../notifications/notifications.service';

let publishWorker: Worker | null = null;

const N8N_BASE_URL = process.env.N8N_BASE_URL ?? '';
const N8N_TIMEOUT  = 30_000;

interface PublishJobData {
  scheduled_post_id: string;
  user_id?: string;
}

async function callN8nPublish(postId: string, post: Record<string, unknown>): Promise<{ success: boolean; platform_post_id?: string; error?: string }> {
  if (!N8N_BASE_URL) {
    return { success: false, error: 'N8N_BASE_URL not configured' };
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), N8N_TIMEOUT);

    const res = await fetch(`${N8N_BASE_URL}/webhook/publish-post`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ scheduled_post_id: postId, ...post }),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!res.ok) {
      const body = await res.text().catch(() => 'unknown error');
      return { success: false, error: `n8n responded ${res.status}: ${body.slice(0, 200)}` };
    }

    const data = (await res.json()) as { platform_post_id?: string };
    return { success: true, platform_post_id: data.platform_post_id };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return { success: false, error: msg };
  }
}

async function processPublishJob(job: Job<PublishJobData>): Promise<void> {
  const { scheduled_post_id, user_id } = job.data;

  console.log(`[PublishWorker] Processing job=${job.id} post=${scheduled_post_id}`);

  const post = await publishingEngineService.markPublishing(scheduled_post_id);

  const result = await callN8nPublish(scheduled_post_id, {
    social_account_id: post.social_account_id,
    caption: post.caption,
    hashtags: post.hashtags,
    media_urls: post.media_urls,
    campaign_id: post.campaign_id,
  });

  if (result.success) {
    await publishingEngineService.recordPublishSuccess(
      scheduled_post_id,
      result.platform_post_id ?? '',
      { source: 'n8n', job_id: job.id },
    );

    if (user_id) {
      await notificationService.notifyContentPublished(
        user_id,
        scheduled_post_id,
        post.social_account_id,
      ).catch(() => undefined);
    }

    console.log(`[PublishWorker] Job=${job.id} SUCCESS post=${scheduled_post_id}`);
  } else {
    const maxRetries = 3;
    await publishingEngineService.recordPublishFailure(
      scheduled_post_id,
      result.error ?? 'Unknown error',
      maxRetries,
    );

    if (user_id) {
      await notificationService.notifyPublishFailed(
        user_id,
        scheduled_post_id,
        post.social_account_id,
        result.error ?? 'Unknown error',
      ).catch(() => undefined);
    }

    console.error(`[PublishWorker] Job=${job.id} FAILED post=${scheduled_post_id}: ${result.error}`);
    throw new Error(result.error);
  }
}

export function startPublishWorker(): void {
  if (!process.env.REDIS_URL) {
    console.log('[PublishWorker] Redis not configured — worker not started');
    return;
  }

  publishWorker = new Worker('growth-publish', processPublishJob, {
    connection: createWorkerConnection(),
    concurrency: 5,
  });

  publishWorker.on('failed', (job, err) => {
    console.error(`[PublishWorker] Job=${job?.id} permanently failed:`, err instanceof Error ? err.message : err);
  });

  publishWorker.on('error', (err) => {
    console.error('[PublishWorker] Worker error:', err instanceof Error ? err.stack : err);
  });

  console.log('[PublishWorker] Started: growth-publish (concurrency=5)');
}

export async function stopPublishWorker(): Promise<void> {
  await publishWorker?.close();
  console.log('[PublishWorker] Stopped');
}

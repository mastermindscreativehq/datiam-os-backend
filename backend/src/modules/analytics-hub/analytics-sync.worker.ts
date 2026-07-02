import { Worker, Job } from 'bullmq';
import { createWorkerConnection } from '../../queues';
import { analyticsHubService } from './analytics-hub.service';
import { socialAccountService } from '../social-accounts/social-accounts.service';
import { notificationService } from '../notifications/notifications.service';

let analyticsSyncWorker: Worker | null = null;

const N8N_BASE_URL = process.env.N8N_BASE_URL ?? '';
const N8N_TIMEOUT  = 60_000;

interface AnalyticsSyncJobData {
  social_account_id: string;
  platform_id: string;
  date?: string;
  artist_id?: string;
  user_id?: string;
}

async function callN8nAnalyticsSync(accountId: string, platformId: string, date: string): Promise<unknown> {
  if (!N8N_BASE_URL) return null;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), N8N_TIMEOUT);

  try {
    const res = await fetch(`${N8N_BASE_URL}/webhook/sync-analytics`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ social_account_id: accountId, platform_id: platformId, date }),
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!res.ok) return null;
    return res.json();
  } catch {
    clearTimeout(timeout);
    return null;
  }
}

async function processAnalyticsSyncJob(job: Job<AnalyticsSyncJobData>): Promise<void> {
  const { social_account_id, platform_id, date, artist_id, user_id } = job.data;
  const snapshotDate = date ?? new Date().toISOString().split('T')[0];

  console.log(`[AnalyticsSyncWorker] Job=${job.id} account=${social_account_id} date=${snapshotDate}`);

  const payload = await callN8nAnalyticsSync(social_account_id, platform_id, snapshotDate) as any;

  if (payload) {
    await analyticsHubService.ingestSnapshot({
      social_account_id,
      platform_id,
      snapshot_date: snapshotDate,
      views:              payload.views,
      reach:              payload.reach,
      likes:              payload.likes,
      comments:           payload.comments,
      shares:             payload.shares,
      saves:              payload.saves,
      impressions:        payload.impressions,
      followers:          payload.followers,
      followers_gained:   payload.followers_gained,
      streams:            payload.streams,
      playlist_adds:      payload.playlist_adds,
      country_breakdown:  payload.country_breakdown,
      raw_data:           payload,
    });

    await socialAccountService.markSynced(social_account_id);

    if (user_id) {
      const platform = typeof payload.platform === 'string' ? payload.platform : 'platform';
      await notificationService.notifyAnalyticsSynced(user_id, platform, payload.followers_gained ?? 0)
        .catch(() => undefined);
    }
  }

  console.log(`[AnalyticsSyncWorker] Job=${job.id} complete`);
}

export function startAnalyticsSyncWorker(): void {
  if (!process.env.REDIS_URL) {
    console.log('[AnalyticsSyncWorker] Redis not configured — worker not started');
    return;
  }

  analyticsSyncWorker = new Worker('growth-analytics-sync', processAnalyticsSyncJob, {
    connection: createWorkerConnection(),
    concurrency: 3,
  });

  analyticsSyncWorker.on('failed', (job, err) => {
    console.error(`[AnalyticsSyncWorker] Job=${job?.id} failed:`, err instanceof Error ? err.message : err);
  });

  analyticsSyncWorker.on('error', (err) => {
    console.error('[AnalyticsSyncWorker] Worker error:', err instanceof Error ? err.stack : err);
  });

  console.log('[AnalyticsSyncWorker] Started: growth-analytics-sync (concurrency=3)');
}

export async function stopAnalyticsSyncWorker(): Promise<void> {
  await analyticsSyncWorker?.close();
  console.log('[AnalyticsSyncWorker] Stopped');
}

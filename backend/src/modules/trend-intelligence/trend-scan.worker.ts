import { Worker, Job } from 'bullmq';
import { createWorkerConnection } from '../../queues';
import { trendIntelligenceService } from './trend-intelligence.service';

let trendScanWorker: Worker | null = null;

const N8N_BASE_URL = process.env.N8N_BASE_URL ?? '';
const N8N_TIMEOUT  = 30_000;

interface TrendScanJobData {
  platform_slug?: string;
  platform_id?: string;
}

async function callN8nTrendScan(platformSlug?: string): Promise<unknown[]> {
  if (!N8N_BASE_URL) return [];

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), N8N_TIMEOUT);

  try {
    const res = await fetch(`${N8N_BASE_URL}/webhook/scan-trends`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ platform_slug: platformSlug ?? 'all' }),
      signal: controller.signal,
    });
    clearTimeout(timeout);
    if (!res.ok) return [];
    const data = await res.json() as unknown;
    return Array.isArray(data) ? data : [];
  } catch {
    clearTimeout(timeout);
    return [];
  }
}

async function processTrendScanJob(job: Job<TrendScanJobData>): Promise<void> {
  const { platform_slug, platform_id } = job.data;

  console.log(`[TrendScanWorker] Job=${job.id} platform=${platform_slug ?? 'all'}`);

  // 1. Expire any stale trends
  await trendIntelligenceService.expireStale();

  // 2. Fetch new trends from n8n
  const trends = await callN8nTrendScan(platform_slug) as Array<{
    title: string;
    description?: string;
    category: string;
    trend_score?: number;
    hashtags?: string[];
    example_urls?: string[];
    regions?: string[];
    expires_at?: string;
  }>;

  let created = 0;
  for (const trend of trends) {
    try {
      await trendIntelligenceService.create({
        platform_id,
        title: trend.title,
        description: trend.description,
        category: trend.category as any,
        trend_score: trend.trend_score ?? 50,
        hashtags: trend.hashtags,
        example_urls: trend.example_urls,
        regions: trend.regions,
        expires_at: trend.expires_at ? new Date(trend.expires_at) : undefined,
      });
      created++;
    } catch {
      // Skip duplicates or invalid entries
    }
  }

  console.log(`[TrendScanWorker] Job=${job.id} complete — expired stale, created ${created} new trends`);
}

export function startTrendScanWorker(): void {
  if (!process.env.REDIS_URL) {
    console.log('[TrendScanWorker] Redis not configured — worker not started');
    return;
  }

  trendScanWorker = new Worker('growth-trend-scan', processTrendScanJob, {
    connection: createWorkerConnection(),
    concurrency: 1,
  });

  trendScanWorker.on('failed', (job, err) => {
    console.error(`[TrendScanWorker] Job=${job?.id} failed:`, err instanceof Error ? err.message : err);
  });

  trendScanWorker.on('error', (err) => {
    console.error('[TrendScanWorker] Worker error:', err instanceof Error ? err.stack : err);
  });

  console.log('[TrendScanWorker] Started: growth-trend-scan (concurrency=1)');
}

export async function stopTrendScanWorker(): Promise<void> {
  await trendScanWorker?.close();
  console.log('[TrendScanWorker] Stopped');
}

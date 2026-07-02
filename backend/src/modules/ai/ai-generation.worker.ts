import { Worker, Job } from 'bullmq';
import { createWorkerConnection } from '../../queues';
import { growthAIService } from './growth-ai.service';
import { contentVaultService } from '../content/content-vault.service';

let aiGenerationWorker: Worker | null = null;

type JobType = 'caption' | 'hashtags' | 'cta' | 'posting-schedule' | 'enrich' | 'score';

interface AIGenerationJobData {
  job_type: JobType;
  content_id: string;
  platform_slug: string;
  goal?: string;
  artist_id?: string;
}

async function processAIGenerationJob(job: Job<AIGenerationJobData>): Promise<void> {
  const { job_type, content_id, platform_slug, goal } = job.data;

  console.log(`[AIGenerationWorker] Job=${job.id} type=${job_type} content=${content_id}`);

  switch (job_type) {
    case 'caption': {
      const { caption } = await growthAIService.generateCaption(content_id, platform_slug);
      await contentVaultService.update(content_id, { caption });
      console.log(`[AIGenerationWorker] Job=${job.id} caption generated for content=${content_id}`);
      break;
    }

    case 'hashtags': {
      const { hashtags } = await growthAIService.generateHashtags(content_id, platform_slug);
      await contentVaultService.update(content_id, { hashtags });
      console.log(`[AIGenerationWorker] Job=${job.id} ${hashtags.length} hashtags generated for content=${content_id}`);
      break;
    }

    case 'cta': {
      if (!goal) throw new Error('goal is required for cta job_type');
      const { cta } = await growthAIService.generateCTA(content_id, platform_slug, goal);
      await contentVaultService.update(content_id, { cta });
      console.log(`[AIGenerationWorker] Job=${job.id} CTA generated for content=${content_id}`);
      break;
    }

    case 'enrich': {
      const result = await growthAIService.enrichContentIdea(content_id, platform_slug);
      console.log(`[AIGenerationWorker] Job=${job.id} enriched content=${content_id} score=${result.score}`);
      break;
    }

    case 'score': {
      const result = await growthAIService.scoreContentBrief(content_id);
      console.log(`[AIGenerationWorker] Job=${job.id} scored content=${content_id} score=${result.score}`);
      break;
    }

    default:
      console.warn(`[AIGenerationWorker] Unknown job_type: ${job_type}`);
  }
}

export function startAIGenerationWorker(): void {
  if (!process.env.REDIS_URL) {
    console.log('[AIGenerationWorker] Redis not configured — worker not started');
    return;
  }

  aiGenerationWorker = new Worker('growth-ai-generation', processAIGenerationJob, {
    connection: createWorkerConnection(),
    concurrency: 3,
    limiter: { max: 10, duration: 60_000 },
  });

  aiGenerationWorker.on('failed', (job, err) => {
    console.error(`[AIGenerationWorker] Job=${job?.id} failed:`, err instanceof Error ? err.message : err);
  });

  aiGenerationWorker.on('error', (err) => {
    console.error('[AIGenerationWorker] Worker error:', err instanceof Error ? err.stack : err);
  });

  console.log('[AIGenerationWorker] Started: growth-ai-generation (concurrency=3, rate-limited 10/min)');
}

export async function stopAIGenerationWorker(): Promise<void> {
  await aiGenerationWorker?.close();
  console.log('[AIGenerationWorker] Stopped');
}

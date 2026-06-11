import type { Request, Response, NextFunction } from 'express';
import { AppError } from '../../middleware/errorHandler';
import { syncIntelligenceQueue } from '../../queues';
import { SYNC_CATEGORY_LABELS, type SyncCategory } from './sync-intelligence.types';
import {
  createSyncJob,
  getSyncResult,
  getLatestSyncJob,
  validateSyncPrerequisites,
  getArtistSyncLibrary,
  getArtistTopOpportunities,
} from './sync-intelligence.service';

// ── Response serialiser ───────────────────────────────────────────────────────

function parseNum(v: unknown): number | null {
  return v !== null && v !== undefined ? parseFloat(String(v)) : null;
}

// DB confidence column names differ for three categories (shorter aliases)
const CONF_COL: Record<SyncCategory, string> = {
  film_trailer:     'film_trailer_confidence',
  netflix_drama:    'netflix_drama_confidence',
  documentary:      'documentary_confidence',
  sports_content:   'sports_content_confidence',
  gaming:           'gaming_confidence',
  fashion:          'fashion_confidence',
  luxury_brands:    'luxury_brands_confidence',
  travel_campaigns: 'travel_confidence',
  commercial_ads:   'commercial_confidence',
  social_content:   'social_confidence',
};

function serialiseIntel(intel: Record<string, unknown>) {
  const categories = (Object.keys(SYNC_CATEGORY_LABELS) as SyncCategory[]).map(cat => ({
    category:   cat,
    label:      SYNC_CATEGORY_LABELS[cat],
    score:      parseNum(intel[cat]),
    confidence: parseNum(intel[CONF_COL[cat]]),
  })).sort((a, b) => (b.score ?? 0) - (a.score ?? 0));

  return {
    id:        intel['id'],
    upload_id: intel['upload_id'],
    artist_id: intel['artist_id'],
    categories,
    topCategories:   intel['top_categories'],
    syncTags:        intel['sync_tags'],
    placementNotes:  intel['placement_notes'],
    overallSyncScore: parseNum(intel['overall_sync_score']),
    meta: {
      analyzerVersion:  intel['analyzer_version'],
      processingTimeMs: intel['processing_time_ms'],
      analyzedAt:       intel['created_at'],
    },
  };
}

// ── POST /api/sync-intelligence/analyze ──────────────────────────────────────

export async function enqueueSyncAnalysis(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { upload_id } = req.body as { upload_id?: string };
    if (!upload_id) throw new AppError('upload_id is required', 400, 'MISSING_UPLOAD_ID');

    await validateSyncPrerequisites(upload_id);

    if (!syncIntelligenceQueue) {
      throw new AppError('Sync intelligence queue unavailable (Redis not configured)', 503, 'QUEUE_UNAVAILABLE');
    }

    const jobRecord = await createSyncJob(upload_id);

    const bullJob = await syncIntelligenceQueue.add(
      'syncIntelligence',
      { upload_id, job_db_id: jobRecord.id },
      { attempts: 3, backoff: { type: 'exponential', delay: 5000 } },
    );

    res.status(202).json({
      success:      true,
      message:      'Sync intelligence analysis queued',
      job_db_id:    jobRecord.id,
      queue_job_id: bullJob.id,
      upload_id,
    });
  } catch (err) {
    next(err);
  }
}

// ── GET /api/sync-intelligence/:upload_id ─────────────────────────────────────

export async function getSyncAnalysis(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { upload_id } = req.params;
    const result = await getSyncResult(upload_id);

    if (!result) {
      const job = await getLatestSyncJob(upload_id);
      res.json({ success: true, status: job?.status ?? 'not_started', data: null });
      return;
    }

    res.json({
      success: true,
      status:  'completed',
      data: {
        ...serialiseIntel(result.intel as unknown as Record<string, unknown>),
        recentJobs: result.jobs.map(j => ({
          id:          j.id,
          status:      j.status,
          startedAt:   j.started_at,
          completedAt: j.completed_at,
          error:       j.error_message,
        })),
      },
    });
  } catch (err) {
    next(err);
  }
}

// ── GET /api/sync-intelligence/artist/:artist_id ──────────────────────────────

export async function getSyncByArtistHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { artist_id } = req.params;
    const limit = Math.min(parseInt(String(req.query['limit'] ?? '20'), 10) || 20, 100);
    const records = await getArtistSyncLibrary(artist_id, limit);

    res.json({
      success: true,
      count:   records.length,
      data:    records.map(r => serialiseIntel(r as unknown as Record<string, unknown>)),
    });
  } catch (err) {
    next(err);
  }
}

// ── GET /api/sync-intelligence/artist/:artist_id/opportunities ───────────────

export async function getOpportunitiesHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { artist_id } = req.params;
    const minScore = parseInt(String(req.query['min_score'] ?? '60'), 10) || 60;
    const limit    = Math.min(parseInt(String(req.query['limit'] ?? '10'), 10) || 10, 50);

    const records = await getArtistTopOpportunities(artist_id, minScore, limit);

    res.json({
      success: true,
      count:   records.length,
      data:    records.map(r => ({
        id:             r.id,
        upload_id:      r.upload_id,
        file_name:      r.file_name,
        overall:        parseNum(r.overall),
        topCategories:  r.top_categories,
        syncTags:       r.sync_tags,
        placementNotes: r.placement_notes,
        highlights: {
          film_trailer:   parseNum(r.film_trailer),
          sports_content: parseNum(r.sports_content),
          social_content: parseNum(r.social_content),
        },
        createdAt: r.created_at,
      })),
    });
  } catch (err) {
    next(err);
  }
}

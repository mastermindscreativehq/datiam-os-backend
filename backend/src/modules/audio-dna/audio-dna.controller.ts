import type { Request, Response, NextFunction } from 'express';
import { AppError } from '../../middleware/errorHandler';
import { audioDnaQueue } from '../../queues';
import {
  createDnaJob,
  getDnaResult,
  getLatestDnaJob,
  getUploadWithAnalysis,
  getDnaByArtist,
} from './audio-dna.service';

function parseDna(dna: Record<string, unknown>) {
  const num = (v: unknown) => (v !== null && v !== undefined ? parseFloat(String(v)) : null);
  return {
    id:             dna['id'],
    upload_id:      dna['upload_id'],
    artist_id:      dna['artist_id'],
    genre: {
      primary:    dna['primary_genre'],
      secondary:  dna['secondary_genre'],
      confidence: num(dna['genre_confidence']),
      tags:       dna['genre_tags'],
    },
    mood: {
      primary:   dna['mood_primary'],
      secondary: dna['mood_secondary'],
      profile:   dna['mood_profile'],
    },
    fingerprints: {
      emotional: dna['emotional_fingerprint'],
      sonic:     dna['sonic_fingerprint'],
      energy:    dna['energy_fingerprint'],
    },
    dimensions: {
      danceability: num(dna['danceability']),
      brightness:   num(dna['brightness']),
      warmth:       num(dna['warmth']),
      darkness:     num(dna['darkness']),
      aggression:   num(dna['aggression']),
      spirituality: num(dna['spirituality']),
      romance:      num(dna['romance']),
      triumph:      num(dna['triumph']),
      melancholy:   num(dna['melancholy']),
      tension:      num(dna['tension']),
    },
    meta: {
      analyzerVersion:  dna['analyzer_version'],
      processingTimeMs: dna['processing_time_ms'],
      analyzedAt:       dna['created_at'],
    },
  };
}

// POST /api/audio-dna/analyze
export async function enqueueDnaAnalysis(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { upload_id } = req.body as { upload_id?: string };
    if (!upload_id) throw new AppError('upload_id is required', 400, 'MISSING_UPLOAD_ID');

    const { upload, analysis } = await getUploadWithAnalysis(upload_id);

    if (!analysis) {
      throw new AppError(
        'Audio processing must complete before DNA analysis can run. Process the audio first.',
        400,
        'ANALYSIS_NOT_READY',
      );
    }

    if (!audioDnaQueue) {
      throw new AppError('DNA analysis queue unavailable (Redis not configured)', 503, 'QUEUE_UNAVAILABLE');
    }

    const jobRecord = await createDnaJob(upload_id);

    const bullJob = await audioDnaQueue.add(
      'audioDna',
      { upload_id: upload.id, job_db_id: jobRecord.id },
      { attempts: 3, backoff: { type: 'exponential', delay: 5000 } },
    );

    res.status(202).json({
      success:      true,
      message:      'Audio DNA analysis queued',
      job_db_id:    jobRecord.id,
      queue_job_id: bullJob.id,
      upload_id:    upload.id,
    });
  } catch (err) {
    next(err);
  }
}

// GET /api/audio-dna/:upload_id
export async function getDnaAnalysis(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { upload_id } = req.params;
    const result = await getDnaResult(upload_id);

    if (!result) {
      const job = await getLatestDnaJob(upload_id);
      res.json({ success: true, status: job?.status ?? 'not_started', data: null });
      return;
    }

    res.json({
      success: true,
      status:  'completed',
      data: {
        ...parseDna(result.dna as unknown as Record<string, unknown>),
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

// GET /api/audio-dna/artist/:artist_id
export async function getDnaByArtistHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { artist_id } = req.params;
    const limit = Math.min(parseInt(String(req.query['limit'] ?? '20'), 10) || 20, 100);
    const records = await getDnaByArtist(artist_id, limit);

    res.json({
      success: true,
      count:   records.length,
      data:    records.map(d => parseDna(d as unknown as Record<string, unknown>)),
    });
  } catch (err) {
    next(err);
  }
}

import { Request, Response, NextFunction } from 'express';
import { AppError } from '../../middleware/errorHandler';
import {
  initiateUpload,
  getUpload,
  getUploadAnalysis,
  getArtistUploads,
  uploadStem,
  createJobRecord,
  updateJobRecord,
} from './audio.service';
import { audioProcessingQueue, enqueueAudioJob } from '../../queues';

export async function uploadAudio(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const file = req.file;
    if (!file) throw new AppError('No audio file provided', 400, 'NO_FILE');

    const { artist_id, song_id } = req.body as { artist_id?: string; song_id?: string };
    if (!artist_id) throw new AppError('artist_id is required', 400, 'MISSING_ARTIST_ID');

    const upload = await initiateUpload(artist_id, file, song_id);

    // Enqueue async processing job
    if (audioProcessingQueue) {
      const jobRecord = await createJobRecord(upload.id, 'process_audio', { upload_id: upload.id });
      try {
        const bullJob = await enqueueAudioJob(audioProcessingQueue, 'process_audio', {
          upload_id: upload.id,
        });
        if (bullJob) {
          await updateJobRecord(jobRecord.id, { job_id: bullJob, status: 'queued' });
        }
      } catch (err) {
        console.warn('[Audio] Failed to enqueue job (non-fatal):', err);
      }
    }

    res.status(201).json({
      success: true,
      data: {
        upload_id: upload.id,
        session_id: upload.session_id,
        status: upload.status,
        file_name: upload.file_name,
        file_size: upload.file_size,
        storage_url: upload.storage_url,
      },
      message: 'Upload received. Processing queued.',
    });
  } catch (err) {
    next(err);
  }
}

export async function processAudio(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { upload_id } = req.body as { upload_id?: string };
    if (!upload_id) throw new AppError('upload_id is required', 400, 'MISSING_UPLOAD_ID');

    const upload = await getUpload(upload_id);

    if (upload.status === 'analyzed') {
      res.json({ success: true, message: 'Already analyzed', data: { status: upload.status } });
      return;
    }

    if (!audioProcessingQueue) {
      throw new AppError('Queue not available — Redis not configured', 503, 'QUEUE_UNAVAILABLE');
    }

    const jobRecord = await createJobRecord(upload.id, 'process_audio', { upload_id: upload.id });
    const bullId = await enqueueAudioJob(audioProcessingQueue, 'process_audio', {
      upload_id: upload.id,
    });

    if (bullId) await updateJobRecord(jobRecord.id, { job_id: bullId, status: 'queued' });

    res.json({
      success: true,
      data: { upload_id: upload.id, job_id: jobRecord.id, status: 'queued' },
      message: 'Processing queued',
    });
  } catch (err) {
    next(err);
  }
}

export async function getAudioById(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const upload = await getUpload(req.params.id);
    res.json({ success: true, data: upload });
  } catch (err) {
    next(err);
  }
}

export async function getAudioAnalysis(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const result = await getUploadAnalysis(req.params.id);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

export async function listUploads(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { artist_id, limit } = req.query as { artist_id?: string; limit?: string };
    if (!artist_id) throw new AppError('artist_id query param required', 400);
    const uploads = await getArtistUploads(artist_id, limit ? parseInt(limit, 10) : 20);
    res.json({ success: true, data: uploads });
  } catch (err) {
    next(err);
  }
}

export async function uploadAudioStem(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const file = req.file;
    if (!file) throw new AppError('No stem file provided', 400, 'NO_FILE');

    const { upload_id, artist_id, stem_type } = req.body as {
      upload_id?: string;
      artist_id?: string;
      stem_type?: string;
    };
    if (!upload_id) throw new AppError('upload_id is required', 400);
    if (!artist_id) throw new AppError('artist_id is required', 400);
    if (!stem_type) throw new AppError('stem_type is required', 400);

    const stem = await uploadStem(upload_id, artist_id, stem_type, file);
    res.status(201).json({ success: true, data: stem });
  } catch (err) {
    next(err);
  }
}

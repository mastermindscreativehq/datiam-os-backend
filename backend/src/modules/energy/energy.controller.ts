import type { Request, Response, NextFunction } from 'express';
import { AppError } from '../../middleware/errorHandler';
import { energyAnalysisQueue } from '../../queues';
import {
  createEnergyJob,
  getEnergyAnalysis,
  getLatestEnergyJob,
  getUploadForEnergy,
} from './energy.service';

// POST /api/energy/analyze
// Body: { upload_id: string }
export async function enqueueEnergyAnalysis(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { upload_id } = req.body as { upload_id?: string };
    if (!upload_id) throw new AppError('upload_id is required', 400, 'MISSING_UPLOAD_ID');

    // Verify the upload exists
    const upload = await getUploadForEnergy(upload_id);

    if (!energyAnalysisQueue) {
      throw new AppError('Energy analysis queue is not available (Redis not configured)', 503, 'QUEUE_UNAVAILABLE');
    }

    // Create a DB job record first so we can pass its ID to the worker
    const jobRecord = await createEnergyJob(upload_id);

    const bullJob = await energyAnalysisQueue.add(
      'energyAnalysis',
      { upload_id: upload.id, job_db_id: jobRecord.id },
      { attempts: 3, backoff: { type: 'exponential', delay: 5000 } },
    );

    res.status(202).json({
      success:    true,
      message:    'Energy analysis queued',
      job_db_id:  jobRecord.id,
      queue_job_id: bullJob.id,
      upload_id:  upload.id,
    });
  } catch (err) {
    next(err);
  }
}

// GET /api/energy/:upload_id
export async function getAnalysisResult(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { upload_id } = req.params;
    const result = await getEnergyAnalysis(upload_id);

    if (!result) {
      const job = await getLatestEnergyJob(upload_id);
      res.json({
        success: true,
        status:  job?.status ?? 'not_started',
        data:    null,
      });
      return;
    }

    const { analysis, sections, jobs } = result;

    res.json({
      success: true,
      status:  'completed',
      data: {
        intelligence: {
          energyArc:        analysis.energy_arc,
          peakMoment:       analysis.peak_moment,
          dropStrength:     analysis.drop_strength !== null ? parseFloat(String(analysis.drop_strength)) : null,
          energyVolatility: analysis.energy_volatility !== null ? parseFloat(String(analysis.energy_volatility)) : null,
          tensionCurve:     analysis.tension_curve,
          replayRetention:  analysis.replay_retention !== null ? parseFloat(String(analysis.replay_retention)) : null,
        },
        energyCurve: analysis.energy_curve,
        sections:    sections.map(s => ({
          sectionType:         s.section_type,
          sectionIndex:        s.section_index,
          startTime:           parseFloat(String(s.start_time)),
          endTime:             parseFloat(String(s.end_time)),
          duration:            parseFloat(String(s.duration)),
          energyScore:         s.energy_score !== null ? parseFloat(String(s.energy_score)) : null,
          tensionScore:        s.tension_score !== null ? parseFloat(String(s.tension_score)) : null,
          avgRms:              s.avg_rms !== null ? parseFloat(String(s.avg_rms)) : null,
          avgSpectralCentroid: s.avg_spectral_centroid !== null ? parseFloat(String(s.avg_spectral_centroid)) : null,
        })),
        meta: {
          analyzerVersion: analysis.analyzer_version,
          frameSize:       analysis.frame_size,
          hopSize:         analysis.hop_size,
          sampleRate:      analysis.sample_rate,
          analyzedAt:      analysis.created_at,
        },
        recentJobs: jobs.slice(0, 3).map(j => ({
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

// GET /api/energy/:upload_id/sections
export async function getSections(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { upload_id } = req.params;
    const result = await getEnergyAnalysis(upload_id);

    if (!result) {
      res.status(404).json({ success: false, message: 'No energy analysis found for this upload' });
      return;
    }

    res.json({
      success:  true,
      sections: result.sections.map(s => ({
        sectionType:         s.section_type,
        sectionIndex:        s.section_index,
        startTime:           parseFloat(String(s.start_time)),
        endTime:             parseFloat(String(s.end_time)),
        duration:            parseFloat(String(s.duration)),
        energyScore:         s.energy_score !== null ? parseFloat(String(s.energy_score)) : null,
        tensionScore:        s.tension_score !== null ? parseFloat(String(s.tension_score)) : null,
        avgRms:              s.avg_rms !== null ? parseFloat(String(s.avg_rms)) : null,
        peakRms:             s.peak_rms !== null ? parseFloat(String(s.peak_rms)) : null,
        avgSpectralCentroid: s.avg_spectral_centroid !== null ? parseFloat(String(s.avg_spectral_centroid)) : null,
        avgSpectralFlux:     s.avg_spectral_flux !== null ? parseFloat(String(s.avg_spectral_flux)) : null,
        avgZcr:              s.avg_zcr !== null ? parseFloat(String(s.avg_zcr)) : null,
      })),
    });
  } catch (err) {
    next(err);
  }
}

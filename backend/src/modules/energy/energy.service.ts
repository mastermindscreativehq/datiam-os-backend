import { eq, desc } from 'drizzle-orm';
import { db } from '../../db';
import {
  energy_analysis,
  energy_sections,
  energy_jobs,
  audio_uploads,
} from '../../db/schema';
import { AppError } from '../../middleware/errorHandler';
import { logActivity } from '../../lib/activityLogger';
import type { EnergyIntelligence, EnergyCurvePoint } from './energy.scoring';
import type { EnergySection } from './energy.sections';
import { FRAME_SIZE, HOP_SIZE, SAMPLE_RATE, ANALYZER_VERSION } from './energy.analyzer';

// ------------------------------------------------------------------
// Job management
// ------------------------------------------------------------------

export async function createEnergyJob(
  uploadId: string,
): Promise<typeof energy_jobs.$inferSelect> {
  const [job] = await db
    .insert(energy_jobs)
    .values({ upload_id: uploadId, status: 'pending' })
    .returning();
  return job;
}

export async function markEnergyJobStarted(
  jobDbId: string,
  queueJobId: string,
): Promise<void> {
  await db
    .update(energy_jobs)
    .set({ status: 'processing', queue_job_id: queueJobId, started_at: new Date() })
    .where(eq(energy_jobs.id, jobDbId))
    .catch((err) => console.error('[EnergyService] markEnergyJobStarted DB update failed:', err instanceof Error ? err.stack : err));
}

export async function markEnergyJobDone(
  jobDbId: string,
  status: 'completed' | 'failed',
  errorMessage?: string,
): Promise<void> {
  await db
    .update(energy_jobs)
    .set({
      status,
      error_message: errorMessage ?? null,
      completed_at:  status === 'completed' ? new Date() : null,
    })
    .where(eq(energy_jobs.id, jobDbId))
    .catch((err) => console.error('[EnergyService] markEnergyJobDone DB update failed:', err instanceof Error ? err.stack : err));
}

// ------------------------------------------------------------------
// Upload lookup (re-uses audio_uploads table)
// ------------------------------------------------------------------

export async function getUploadForEnergy(
  uploadId: string,
): Promise<typeof audio_uploads.$inferSelect> {
  const [upload] = await db
    .select()
    .from(audio_uploads)
    .where(eq(audio_uploads.id, uploadId))
    .limit(1);
  if (!upload) throw new AppError('Upload not found', 404, 'UPLOAD_NOT_FOUND');
  return upload;
}

// ------------------------------------------------------------------
// Save analysis results (upsert pattern)
// ------------------------------------------------------------------

export async function saveEnergyAnalysis(
  uploadId:       string,
  artistId:       string | null,
  intelligence:   EnergyIntelligence,
  sections:       EnergySection[],
  energyCurve:    EnergyCurvePoint[],
): Promise<void> {
  await db.transaction(async (tx) => {
    // Upsert energy_analysis
    const existing = await tx
      .select({ id: energy_analysis.id })
      .from(energy_analysis)
      .where(eq(energy_analysis.upload_id, uploadId))
      .limit(1);

    let analysisId: string;

    const analysisValues = {
      energy_arc:        intelligence.energyArc,
      peak_moment:       intelligence.peakMoment,
      drop_strength:     String(intelligence.dropStrength),
      energy_volatility: String(intelligence.energyVolatility),
      tension_curve:     intelligence.tensionCurve,
      replay_retention:  String(intelligence.replayRetention),
      energy_curve:      energyCurve,
      frame_size:        FRAME_SIZE,
      hop_size:          HOP_SIZE,
      sample_rate:       SAMPLE_RATE,
      analyzer_version:  ANALYZER_VERSION,
      updated_at:        new Date(),
    };

    if (existing.length > 0) {
      analysisId = existing[0].id;
      await tx
        .update(energy_analysis)
        .set(analysisValues)
        .where(eq(energy_analysis.upload_id, uploadId));

      // Remove stale sections before re-inserting
      await tx
        .delete(energy_sections)
        .where(eq(energy_sections.analysis_id, analysisId));
    } else {
      const [row] = await tx
        .insert(energy_analysis)
        .values({ upload_id: uploadId, artist_id: artistId, ...analysisValues })
        .returning({ id: energy_analysis.id });
      analysisId = row.id;
    }

    // Insert sections
    if (sections.length > 0) {
      await tx.insert(energy_sections).values(
        sections.map(s => ({
          analysis_id:           analysisId,
          upload_id:             uploadId,
          section_type:          s.sectionType,
          section_index:         s.sectionIndex,
          start_time:            String(s.startTime),
          end_time:              String(s.endTime),
          duration:              String(s.duration),
          avg_rms:               String(s.avgRms),
          peak_rms:              String(s.peakRms),
          avg_spectral_centroid: String(s.avgSpectralCentroid),
          avg_spectral_flux:     String(s.avgSpectralFlux),
          avg_zcr:               String(s.avgZcr),
          energy_score:          String(s.energyScore),
          tension_score:         String(s.tensionScore),
        })),
      );
    }
  });

  logActivity({
    eventType:   'energy.analysis.complete',
    module:      'energy',
    title:       'Energy analysis complete',
    description: `Arc: ${intelligence.energyArc} | Peak: ${intelligence.peakMoment} | Drop: ${intelligence.dropStrength} | Sections: ${sections.length}`,
    metadata:    { upload_id: uploadId, artist_id: artistId, section_count: sections.length },
  });
}

// ------------------------------------------------------------------
// Read
// ------------------------------------------------------------------

export async function getEnergyAnalysis(uploadId: string) {
  const [analysis] = await db
    .select()
    .from(energy_analysis)
    .where(eq(energy_analysis.upload_id, uploadId))
    .limit(1);

  if (!analysis) return null;

  const sections = await db
    .select()
    .from(energy_sections)
    .where(eq(energy_sections.analysis_id, analysis.id))
    .orderBy(energy_sections.section_index);

  const jobs = await db
    .select()
    .from(energy_jobs)
    .where(eq(energy_jobs.upload_id, uploadId))
    .orderBy(desc(energy_jobs.created_at));

  return { analysis, sections, jobs };
}

export async function getLatestEnergyJob(
  uploadId: string,
): Promise<typeof energy_jobs.$inferSelect | null> {
  const [job] = await db
    .select()
    .from(energy_jobs)
    .where(eq(energy_jobs.upload_id, uploadId))
    .orderBy(desc(energy_jobs.created_at))
    .limit(1);
  return job ?? null;
}

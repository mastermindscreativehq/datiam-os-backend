import { z } from 'zod';

export const PREDICTION_TYPES = [
  'sync_suitability', 'placement_likelihood', 'fee_estimate',
  'rejection_risk', 'time_to_placement',
] as const;

export const logPredictionSchema = z.object({
  model_version:    z.string().min(1),
  prediction_type:  z.enum(PREDICTION_TYPES),
  analyzer_version: z.string().optional(),
  upload_id:        z.string().uuid().optional(),
  song_id:          z.string().uuid().optional(),
  opportunity_id:   z.string().uuid().optional(),
  predicted_value:  z.number(),
  predicted_label:  z.string().optional(),
  feature_vector:   z.record(z.unknown()).optional(),
  raw_model_output: z.record(z.unknown()).optional(),
  notes:            z.string().optional(),
});

export const resolvePredictionSchema = z.object({
  actual_value: z.number(),
  actual_label: z.string().optional(),
  notes:        z.string().optional(),
});

export type LogPredictionInput     = z.infer<typeof logPredictionSchema>;
export type ResolvePredictionInput = z.infer<typeof resolvePredictionSchema>;

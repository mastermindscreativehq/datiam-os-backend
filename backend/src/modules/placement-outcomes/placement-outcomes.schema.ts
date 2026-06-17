import { z } from 'zod';

export const OUTCOME_TYPES = [
  'placed', 'rejected', 'expired', 'negotiation_failed', 'withdrawn_by_artist',
] as const;

export const SYNC_LICENSE_TYPES = [
  'film_trailer', 'netflix_drama', 'documentary', 'sports_content', 'gaming',
  'fashion', 'luxury_brand', 'travel_campaign', 'commercial_ad', 'social_content',
  'tv_drama', 'tv_comedy', 'reality_tv', 'podcast', 'youtube', 'music_library',
] as const;

export const createOutcomeSchema = z.object({
  opportunity_id:          z.string().uuid(),
  artist_id:               z.string().uuid(),
  song_id:                 z.string().uuid().optional(),
  outcome:                 z.enum(OUTCOME_TYPES),
  rejection_reason:        z.string().optional(),
  final_fee_usd:           z.number().nonnegative().optional(),
  currency:                z.string().length(3).optional(),
  royalties_collected_usd: z.number().nonnegative().optional(),
  license_type:            z.enum(SYNC_LICENSE_TYPES).optional(),
  territory:               z.string().optional(),
  term_start:              z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  term_end:                z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  exclusivity:             z.boolean().optional(),
  contract_url:            z.string().url().optional(),
  contract_reference:      z.string().optional(),
  ai_score_at_pitch:       z.number().min(0).max(100).optional(),
  outcome_quality_score:   z.number().min(0).max(100).optional(),
  notes:                   z.string().optional(),
  metadata:                z.record(z.unknown()).optional(),
});

export const updateOutcomeSchema = createOutcomeSchema
  .partial()
  .omit({ opportunity_id: true, artist_id: true });

export type CreateOutcomeInput = z.infer<typeof createOutcomeSchema>;
export type UpdateOutcomeInput = z.infer<typeof updateOutcomeSchema>;

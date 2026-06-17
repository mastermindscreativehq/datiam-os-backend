import { z } from 'zod';

export const COMPANY_TYPES = [
  'production_house', 'ad_agency', 'music_supervisor_firm', 'brand',
  'streaming_platform', 'game_studio', 'trailer_house', 'music_library',
  'tv_network', 'film_studio', 'other',
] as const;

export const COMPANY_TIERS = ['tier_a', 'tier_b', 'tier_c', 'unrated'] as const;

export const createCompanySchema = z.object({
  name:                 z.string().min(1),
  type:                 z.enum(COMPANY_TYPES).optional(),
  tier:                 z.enum(COMPANY_TIERS).optional(),
  website:              z.string().url().optional(),
  country:              z.string().optional(),
  city:                 z.string().optional(),
  genre_focus:          z.array(z.string()).optional(),
  deal_volume_per_year: z.number().int().positive().optional(),
  avg_license_fee_usd:  z.number().nonnegative().optional(),
  notes:                z.string().optional(),
  org_id:               z.string().uuid().optional(),
});

export const updateCompanySchema = createCompanySchema.partial();

export type CreateCompanyInput = z.infer<typeof createCompanySchema>;
export type UpdateCompanyInput = z.infer<typeof updateCompanySchema>;

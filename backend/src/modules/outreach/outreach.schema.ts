import { z } from 'zod';

export const createCampaignSchema = z.object({
  company_id:       z.string().uuid('company_id must be a valid UUID'),
  contact_id:       z.string().uuid('contact_id must be a valid UUID').optional(),
  artist_id:        z.string().uuid('artist_id must be a valid UUID').optional(),
  opportunity_id:   z.string().uuid('opportunity_id must be a valid UUID').optional(),
  notes:            z.string().max(2000).optional(),
});

export type CreateCampaignInput = z.infer<typeof createCampaignSchema>;

import { z } from 'zod';

export const RELATIONSHIP_STATUSES = [
  'prospect', 'active', 'dormant', 'unresponsive', 'blacklisted',
] as const;

export const createContactSchema = z.object({
  artist_id:           z.string().uuid(),
  company_id:          z.string().uuid().optional(),
  full_name:           z.string().min(1),
  email:               z.string().email().optional(),
  phone:               z.string().optional(),
  role:                z.string().optional(),
  linkedin_url:        z.string().url().optional(),
  imdb_url:            z.string().url().optional(),
  relationship_status: z.enum(RELATIONSHIP_STATUSES).optional(),
  relationship_score:  z.number().int().min(1).max(10).optional(),
  last_contacted_at:   z.string().datetime().optional(),
  next_follow_up_at:   z.string().datetime().optional(),
  genre_preferences:   z.array(z.string()).optional(),
  notes:               z.string().optional(),
});

export const updateContactSchema = createContactSchema.partial().extend({
  artist_id: z.string().uuid().optional(),
});

export type CreateContactInput = z.infer<typeof createContactSchema>;
export type UpdateContactInput = z.infer<typeof updateContactSchema>;

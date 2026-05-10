import { z } from 'zod';

export const createCrmContactSchema = z.object({
  name: z.string().min(1),
  company: z.string().optional(),
  role: z.string().optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  platform: z.string().optional(),
  contact_type: z.enum([
    'playlist_curator',
    'blogger',
    'dj',
    'influencer',
    'music_supervisor',
    'radio',
    'podcast',
    'press',
  ]),
  relationship_status: z.string().optional(),
  notes: z.string().optional(),
});

export const updateCrmContactSchema = createCrmContactSchema.partial();

export type CreateCrmContactInput = z.infer<typeof createCrmContactSchema>;
export type UpdateCrmContactInput = z.infer<typeof updateCrmContactSchema>;

import { z } from 'zod';

export const createSyncPitchSchema = z.object({
  song_id: z.string().uuid(),
  pitch_target: z.string().min(1),
  contact_name: z.string().optional(),
  contact_email: z.string().email().optional(),
  opportunity_type: z.enum(['film', 'tv', 'ad', 'game', 'trailer', 'youtube', 'library']),
  mood_fit: z.string().optional(),
  status: z.enum(['prospect', 'pitched', 'follow_up', 'accepted', 'rejected']).optional(),
  pitch_date: z.string().optional(),
  follow_up_date: z.string().optional(),
  notes: z.string().optional(),
});

export const updateSyncPitchSchema = createSyncPitchSchema.partial().omit({ song_id: true });

export type CreateSyncPitchInput = z.infer<typeof createSyncPitchSchema>;
export type UpdateSyncPitchInput = z.infer<typeof updateSyncPitchSchema>;

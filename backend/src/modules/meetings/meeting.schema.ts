import { z } from 'zod';

export const createMeetingSchema = z.object({
  campaign_id:   z.string().uuid('campaign_id must be a valid UUID'),
  contact_id:    z.string().uuid().optional(),
  reply_log_id:  z.string().uuid().optional(),
  meeting_title: z.string().min(1).max(500),
  meeting_type:  z.enum(['discovery', 'pitch', 'licensing', 'sync', 'partnership', 'followup']).optional(),
  scheduled_at:  z.string().datetime().optional(),
  timezone:      z.string().max(100).optional(),
  meeting_link:  z.string().url().optional(),
  notes:         z.string().max(10000).optional(),
});

export const updateMeetingStatusSchema = z.object({
  status: z.enum(['scheduled', 'confirmed', 'completed', 'cancelled', 'no_show']),
});

export const updateMeetingNotesSchema = z.object({
  notes: z.string().max(10000),
});

export type CreateMeetingInput       = z.infer<typeof createMeetingSchema>;
export type UpdateMeetingStatusInput = z.infer<typeof updateMeetingStatusSchema>;
export type UpdateMeetingNotesInput  = z.infer<typeof updateMeetingNotesSchema>;

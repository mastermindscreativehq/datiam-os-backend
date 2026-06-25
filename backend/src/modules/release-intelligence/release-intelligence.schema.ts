import { z } from 'zod';

export const createCampaignSchema = z.object({
  campaign_type: z.enum(['marketing', 'playlist', 'blog', 'press', 'pre_save']),
  title: z.string().min(1).max(200),
  status: z.enum(['planned', 'active', 'paused', 'completed', 'cancelled']).optional(),
  target_date: z.string().optional().nullable(),
  budget: z.number().positive().optional().nullable(),
  currency: z.string().default('USD'),
  notes: z.string().optional().nullable(),
  metadata: z.record(z.unknown()).optional().nullable(),
});

export const updateCampaignSchema = createCampaignSchema.partial();

export const updateDspStatusSchema = z.object({
  status: z.enum(['not_submitted', 'submitted', 'processing', 'live', 'rejected', 'taken_down']),
  url: z.string().optional().nullable(),
  submitted_at: z.string().optional().nullable(),
  live_at: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

export const resolveAlertSchema = z.object({
  resolved: z.boolean(),
});

export const actionRecSchema = z.object({
  is_actioned: z.boolean(),
});

export type CreateCampaignInput  = z.infer<typeof createCampaignSchema>;
export type UpdateCampaignInput  = z.infer<typeof updateCampaignSchema>;
export type UpdateDspStatusInput = z.infer<typeof updateDspStatusSchema>;

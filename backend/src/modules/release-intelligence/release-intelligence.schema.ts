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

// ── Release Intelligence v1 (migration 0051) — release field updates ─────────

export const updateReleaseFieldsSchema = z.object({
  upc: z.string().optional(),
  distributor: z.string().optional(),
  pre_save_url: z.string().url().optional().or(z.literal('')),
  smart_link: z.string().url().optional().or(z.literal('')),
  release_date: z.string().optional(),
  cover_art_url: z.string().url().optional().or(z.literal('')),
  music_status: z.enum(['draft', 'scheduled', 'released']).optional(),
  spotify_url: z.string().url().optional().or(z.literal('')),
  apple_music_url: z.string().url().optional().or(z.literal('')),
  audiomack_url: z.string().url().optional().or(z.literal('')),
  boomplay_url: z.string().url().optional().or(z.literal('')),
  youtube_url: z.string().url().optional().or(z.literal('')),
  deezer_url: z.string().url().optional().or(z.literal('')),
  tidal_url: z.string().url().optional().or(z.literal('')),
  amazon_music_url: z.string().url().optional().or(z.literal('')),
  youtube_music_url: z.string().url().optional().or(z.literal('')),
  soundcloud_url: z.string().url().optional().or(z.literal('')),
  territories: z.array(z.string()).optional(),
  primary_isrc: z.string().optional(),
});

export const dispatchReleaseAutomationSchema = z.object({
  notes: z.string().optional(),
  metadata: z.record(z.unknown()).optional().default({}),
});

export type CreateCampaignInput  = z.infer<typeof createCampaignSchema>;
export type UpdateCampaignInput  = z.infer<typeof updateCampaignSchema>;
export type UpdateDspStatusInput = z.infer<typeof updateDspStatusSchema>;
export type UpdateReleaseFieldsInput = z.infer<typeof updateReleaseFieldsSchema>;
export type DispatchReleaseAutomationInput = z.infer<typeof dispatchReleaseAutomationSchema>;

import { z } from 'zod';

export const createPlaylistSchema = z.object({
  name: z.string().min(1),
  type: z.enum(['editorial', 'user', 'dsp', 'curator']),
  dsp: z.enum(['spotify', 'apple_music', 'youtube_music', 'amazon_music', 'tidal', 'deezer', 'other']).optional(),
  curator_contact_id: z.string().uuid().optional(),
  external_url: z.string().url().optional(),
  genre_tags: z.array(z.string()).optional(),
  follower_count: z.number().int().nonnegative().optional(),
  notes: z.string().optional(),
});

export const updatePlaylistSchema = createPlaylistSchema.partial();

export const createPitchSchema = z.object({
  playlist_id: z.string().uuid(),
  song_id: z.string().uuid(),
  release_id: z.string().uuid().optional(),
  outreach_message_id: z.string().uuid().optional(),
  pitch_note: z.string().optional(),
});

export const updatePitchStatusSchema = z.object({
  status: z.enum(['draft', 'submitted', 'under_review', 'accepted', 'rejected', 'added', 'removed']),
  decision_note: z.string().optional(),
});

export const createPlacementSchema = z.object({
  playlist_id: z.string().uuid(),
  song_id: z.string().uuid(),
  pitch_id: z.string().uuid().optional(),
  source: z.enum(['pitch', 'algorithmic', 'organic', 'paid', 'unknown']).default('unknown'),
  position: z.number().int().positive().optional(),
  added_at: z.string(),
});

export const createAnalyticsSchema = z.object({
  placement_id: z.string().uuid(),
  snapshot_date: z.string(),
  streams: z.number().int().nonnegative().optional(),
  saves: z.number().int().nonnegative().optional(),
  skip_rate: z.number().min(0).max(100).optional(),
});

export const recordOutreachTouchSchema = z.object({
  playlist_id: z.string().uuid(),
  outreach_message_id: z.string().uuid().optional(),
  event_type: z.string().min(1),
  note: z.string().optional(),
});

export const linkCampaignSchema = z.object({
  campaign_id: z.string().uuid(),
  playlist_id: z.string().uuid(),
  goal_adds: z.number().int().positive().optional(),
});

export type CreatePlaylistInput = z.infer<typeof createPlaylistSchema>;
export type UpdatePlaylistInput = z.infer<typeof updatePlaylistSchema>;
export type CreatePitchInput = z.infer<typeof createPitchSchema>;
export type UpdatePitchStatusInput = z.infer<typeof updatePitchStatusSchema>;
export type CreatePlacementInput = z.infer<typeof createPlacementSchema>;
export type CreateAnalyticsInput = z.infer<typeof createAnalyticsSchema>;
export type RecordOutreachTouchInput = z.infer<typeof recordOutreachTouchSchema>;
export type LinkCampaignInput = z.infer<typeof linkCampaignSchema>;

import { z } from 'zod';

export const ingestSnapshotSchema = z.object({
  social_account_id: z.string().uuid(),
  platform_id: z.string().uuid(),
  snapshot_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  views: z.number().int().min(0).optional(),
  reach: z.number().int().min(0).optional(),
  watch_time_seconds: z.number().int().min(0).optional(),
  likes: z.number().int().min(0).optional(),
  comments: z.number().int().min(0).optional(),
  shares: z.number().int().min(0).optional(),
  saves: z.number().int().min(0).optional(),
  impressions: z.number().int().min(0).optional(),
  followers: z.number().int().min(0).optional(),
  followers_gained: z.number().int().optional(),
  streams: z.number().int().min(0).optional(),
  playlist_adds: z.number().int().min(0).optional(),
  ctr: z.string().optional(),
  profile_visits: z.number().int().min(0).optional(),
  country_breakdown: z.record(z.number()).optional(),
  device_breakdown: z.record(z.number()).optional(),
  traffic_breakdown: z.record(z.number()).optional(),
  raw_data: z.record(z.unknown()).optional(),
});

export const ingestPostAnalyticsSchema = z.object({
  published_post_id: z.string().uuid(),
  snapshot_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  views: z.number().int().min(0).optional(),
  reach: z.number().int().min(0).optional(),
  likes: z.number().int().min(0).optional(),
  comments: z.number().int().min(0).optional(),
  shares: z.number().int().min(0).optional(),
  saves: z.number().int().min(0).optional(),
  watch_time_seconds: z.number().int().min(0).optional(),
  engagement_rate: z.string().optional(),
  raw_data: z.record(z.unknown()).optional(),
});

export const ingestPlatformMetricsSchema = z.object({
  artist_id: z.string().uuid(),
  platform_id: z.string().uuid(),
  song_id: z.string().uuid().optional(),
  period_start: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  period_end: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  total_streams: z.number().int().min(0).optional(),
  total_views: z.number().int().min(0).optional(),
  total_reach: z.number().int().min(0).optional(),
  avg_engagement_rate: z.string().optional(),
  followers_end: z.number().int().min(0).optional(),
  followers_change: z.number().int().optional(),
  top_country: z.string().optional(),
  metadata: z.record(z.unknown()).optional(),
});

export const analyticsQuerySchema = z.object({
  artist_id: z.string().uuid(),
  days: z.coerce.number().int().min(1).max(365).optional(),
  platform_id: z.string().uuid().optional(),
  song_id: z.string().uuid().optional(),
  limit: z.coerce.number().int().min(1).max(50).optional(),
});

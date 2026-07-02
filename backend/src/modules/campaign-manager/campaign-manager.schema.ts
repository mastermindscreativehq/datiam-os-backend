import { z } from 'zod';

export const createCampaignSchema = z.object({
  artist_id: z.string().uuid().optional(),
  song_id: z.string().uuid().optional(),
  release_id: z.string().uuid().optional(),
  name: z.string().min(1).max(200),
  description: z.string().optional(),
  campaign_type: z.enum(['awareness', 'release', 'playlist_push', 'press', 'social', 'advertising', 'sync', 'custom']).optional(),
  start_date: z.string().optional(),
  end_date: z.string().optional(),
  budget: z.string().optional(),
  target_streams: z.number().int().optional(),
  target_followers: z.number().int().optional(),
  target_reach: z.number().int().optional(),
  metadata: z.record(z.unknown()).optional(),
});

export const updateCampaignSchema = createCampaignSchema.partial().extend({
  status: z.enum(['draft', 'active', 'paused', 'completed', 'cancelled']).optional(),
  actual_streams: z.number().int().optional(),
  actual_followers: z.number().int().optional(),
  actual_reach: z.number().int().optional(),
  budget_spent: z.string().optional(),
  ai_notes: z.string().optional(),
});

export const campaignFilterSchema = z.object({
  artist_id: z.string().uuid().optional(),
  status: z.string().optional(),
  campaign_type: z.string().optional(),
  song_id: z.string().uuid().optional(),
  release_id: z.string().uuid().optional(),
  limit: z.coerce.number().int().min(1).max(200).optional(),
  offset: z.coerce.number().int().min(0).optional(),
});

export const transitionStageSchema = z.object({
  stage: z.enum(['pre_release', 'release_day', 'week_1', 'week_2', 'week_3', 'month_1', 'month_2', 'month_3']),
});

export const createTaskSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  stage: z.enum(['pre_release', 'release_day', 'week_1', 'week_2', 'week_3', 'month_1', 'month_2', 'month_3']).optional(),
  assigned_to: z.string().uuid().optional(),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
  due_date: z.string().optional(),
  metadata: z.record(z.unknown()).optional(),
});

export const updateTaskSchema = createTaskSchema.partial().extend({
  status: z.enum(['todo', 'in_progress', 'done', 'blocked']).optional(),
});

export const createKpiSchema = z.object({
  metric_name: z.string().min(1),
  target_value: z.string().optional(),
  unit: z.string().optional(),
  platform: z.string().optional(),
});

export const updateKpiSchema = z.object({
  actual_value: z.string().min(1),
});

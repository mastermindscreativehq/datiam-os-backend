import { z } from 'zod';

export const schedulePostSchema = z.object({
  content_id: z.string().uuid().optional(),
  social_account_id: z.string().uuid(),
  campaign_id: z.string().uuid().optional(),
  caption: z.string().optional(),
  caption_source: z.enum(['ai', 'manual', 'template']).optional(),
  hashtags: z.array(z.string()).optional(),
  media_urls: z.array(z.string().url()).optional(),
  scheduled_for: z.string().datetime(),
  metadata: z.record(z.unknown()).optional(),
});

export const updateScheduledPostSchema = schedulePostSchema.partial().extend({
  status: z.enum(['draft', 'scheduled', 'cancelled']).optional(),
});

export const publishQueueFilterSchema = z.object({
  social_account_id: z.string().uuid().optional(),
  campaign_id: z.string().uuid().optional(),
  status: z.string().optional(),
  from: z.string().datetime().optional(),
  limit: z.coerce.number().int().min(1).max(200).optional(),
  offset: z.coerce.number().int().min(0).optional(),
});

export const publishedFilterSchema = z.object({
  social_account_id: z.string().uuid().optional(),
  campaign_id: z.string().uuid().optional(),
  limit: z.coerce.number().int().min(1).max(200).optional(),
  offset: z.coerce.number().int().min(0).optional(),
});

export const saveCaptionSchema = z.object({
  caption: z.string().min(1),
  caption_source: z.enum(['ai', 'manual', 'template']),
  ai_model: z.string().optional(),
});

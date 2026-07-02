import { z } from 'zod';

export const createSocialAccountSchema = z.object({
  artist_id: z.string().uuid(),
  platform_id: z.string().uuid(),
  username: z.string().min(1).max(100),
  display_name: z.string().optional(),
  profile_url: z.string().url().optional(),
  profile_image_url: z.string().url().optional(),
  metadata: z.record(z.unknown()).optional(),
});

export const updateSocialAccountSchema = createSocialAccountSchema.partial().extend({
  status: z.enum(['active', 'inactive', 'revoked', 'pending']).optional(),
  access_token_encrypted: z.string().optional(),
  refresh_token_encrypted: z.string().optional(),
  token_expires_at: z.string().datetime().optional(),
});

export const updateMetricsSchema = z.object({
  followers_count: z.number().int().min(0).optional(),
  following_count: z.number().int().min(0).optional(),
  posts_count: z.number().int().min(0).optional(),
  avg_views: z.number().int().min(0).optional(),
  avg_likes: z.number().int().min(0).optional(),
  avg_comments: z.number().int().min(0).optional(),
  engagement_rate: z.string().optional(),
});

export const socialAccountFilterSchema = z.object({
  artist_id: z.string().uuid().optional(),
});

import { z } from 'zod';

const trendCategories = ['sound', 'hashtag', 'challenge', 'meme', 'dance', 'format', 'topic', 'edit', 'transition', 'filter'] as const;

export const createTrendSchema = z.object({
  platform_id: z.string().uuid().optional(),
  title: z.string().min(1).max(200),
  description: z.string().optional(),
  category: z.enum(trendCategories),
  trend_score: z.number().int().min(0).max(100).optional(),
  relevance_score: z.number().int().min(0).max(100).optional(),
  difficulty_score: z.number().int().min(0).max(100).optional(),
  audience_overlap: z.number().int().min(0).max(100).optional(),
  hashtags: z.array(z.string()).optional(),
  example_urls: z.array(z.string().url()).optional(),
  regions: z.array(z.string()).optional(),
  expires_at: z.string().datetime().optional(),
  ai_analysis: z.string().optional(),
  raw_data: z.record(z.unknown()).optional(),
});

export const updateTrendSchema = createTrendSchema.partial().extend({
  status: z.enum(['active', 'expired', 'archived']).optional(),
});

export const trendFilterSchema = z.object({
  platform_id: z.string().uuid().optional(),
  category: z.string().optional(),
  status: z.string().optional(),
  min_trend_score: z.coerce.number().int().optional(),
  limit: z.coerce.number().int().min(1).max(200).optional(),
  offset: z.coerce.number().int().min(0).optional(),
});

export const createRecommendationSchema = z.object({
  content_id: z.string().uuid().optional(),
  artist_id: z.string().uuid().optional(),
  suggestion: z.string().min(1),
  relevance_score: z.number().int().min(0).max(100).optional(),
});

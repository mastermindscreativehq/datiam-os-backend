import { z } from 'zod';

export const generateRecommendationSchema = z.object({
  context_type: z.enum(['song', 'release', 'fan_engagement', 'content', 'sync']),
  entity_id: z.string().uuid().optional(),
  extra_context: z.string().max(500).optional(),
});

export const dismissSchema = z.object({});

export type GenerateRecommendationInput = z.infer<typeof generateRecommendationSchema>;

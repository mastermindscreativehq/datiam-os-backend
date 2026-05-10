import { z } from 'zod';

export const updateFanScoreSchema = z.object({
  score: z.number().int().min(0).max(100),
});

export const fanGrowthQuerySchema = z.object({
  days: z.coerce.number().int().min(1).max(365).default(30),
});

export const topFansQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export type UpdateFanScoreInput = z.infer<typeof updateFanScoreSchema>;

import { z } from 'zod';

export const createRoyaltySchema = z.object({
  song_id: z.string().uuid(),
  platform: z.string().min(1),
  royalty_type: z.enum([
    'master',
    'publishing',
    'mechanical',
    'performance',
    'neighboring',
    'sync',
  ]),
  amount: z.number().positive(),
  currency: z.string().default('USD'),
  period_start: z.string().optional(),
  period_end: z.string().optional(),
  source_file_url: z.string().url().optional(),
});

export type CreateRoyaltyInput = z.infer<typeof createRoyaltySchema>;

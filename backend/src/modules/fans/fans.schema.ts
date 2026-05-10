import { z } from 'zod';

export const createFanSchema = z.object({
  name: z.string().min(1),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  telegram_id: z.string().optional(),
  instagram_handle: z.string().optional(),
  tiktok_handle: z.string().optional(),
  youtube_handle: z.string().optional(),
  country: z.string().optional(),
  city: z.string().optional(),
  source: z.string().optional(),
  emotional_segment: z.string().optional(),
  superfan_score: z.number().int().min(0).max(100).optional(),
});

export const createFanEventSchema = z.object({
  event_type: z.enum([
    'joined_telegram',
    'clicked_link',
    'commented',
    'shared',
    'pre_saved',
    'streamed',
    'replied',
    'purchased',
  ]),
  platform: z.string().optional(),
  metadata: z.record(z.unknown()).optional(),
});

export type CreateFanInput = z.infer<typeof createFanSchema>;
export type CreateFanEventInput = z.infer<typeof createFanEventSchema>;

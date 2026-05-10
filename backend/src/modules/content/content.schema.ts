import { z } from 'zod';

export const createContentIdeaSchema = z.object({
  song_id: z.string().uuid().optional(),
  content_type: z.enum([
    'short_video',
    'interview',
    'post',
    'thread',
    'live_script',
    'reel',
    'tiktok',
    'youtube_short',
  ]),
  hook: z.string().optional(),
  script: z.string().optional(),
  caption: z.string().optional(),
  platform: z.string().optional(),
  status: z
    .enum(['idea', 'scripted', 'recorded', 'edited', 'scheduled', 'posted'])
    .optional(),
  scheduled_date: z.string().optional(),
});

export const updateContentIdeaSchema = createContentIdeaSchema.partial();

export type CreateContentIdeaInput = z.infer<typeof createContentIdeaSchema>;
export type UpdateContentIdeaInput = z.infer<typeof updateContentIdeaSchema>;

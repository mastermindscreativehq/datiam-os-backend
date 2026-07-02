import { z } from 'zod';

const contentTypeValues = [
  'short_video', 'interview', 'post', 'thread', 'live_script', 'reel', 'tiktok',
  'youtube_short', 'story', 'carousel', 'photo', 'lyric_video', 'visualizer',
  'behind_the_scenes', 'studio_session', 'quote', 'meme', 'fan_question',
  'dance_prompt', 'instrumental_clip', 'acapella', 'countdown', 'cover_reveal',
  'wallpaper', 'blog', 'newsletter',
] as const;

export const createContentSchema = z.object({
  content_type: z.enum(contentTypeValues),
  title: z.string().optional(),
  description: z.string().optional(),
  artist_id: z.string().uuid().optional(),
  song_id: z.string().uuid().optional(),
  release_id: z.string().uuid().optional(),
  campaign_id: z.string().uuid().optional(),
  hook: z.string().optional(),
  script: z.string().optional(),
  caption: z.string().optional(),
  platform: z.string().optional(),
  language: z.string().optional(),
  country_targets: z.array(z.string()).optional(),
  platform_targets: z.array(z.string()).optional(),
  mood: z.string().optional(),
  genre: z.string().optional(),
  bpm: z.number().int().optional(),
  musical_key: z.string().optional(),
  cta: z.string().optional(),
  hashtags: z.array(z.string()).optional(),
  thumbnail_url: z.string().url().optional(),
  asset_url: z.string().url().optional(),
  video_duration_seconds: z.number().int().optional(),
  scheduled_date: z.string().optional(),
  tags: z.array(z.string()).optional(),
});

export const updateContentSchema = createContentSchema
  .partial()
  .extend({ status: z.enum(['idea', 'scripted', 'recorded', 'edited', 'scheduled', 'posted']).optional() });

export const contentSearchSchema = z.object({
  artist_id: z.string().uuid().optional(),
  campaign_id: z.string().uuid().optional(),
  status: z.string().optional(),
  content_type: z.string().optional(),
  platform: z.string().optional(),
  search: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(200).optional(),
  offset: z.coerce.number().int().min(0).optional(),
});

export const createTagSchema = z.object({
  name: z.string().min(1).max(50),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
});

export const createVersionSchema = z.object({
  change_note: z.string().optional(),
});

import { z } from 'zod';

export const createReleaseSchema = z.object({
  song_id: z.string().uuid(),
  release_title: z.string().min(1),
  release_type: z.enum(['single', 'ep', 'album']),
  upc: z.string().optional(),
  distributor: z.string().optional(),
  release_date: z.string().optional(),
  pre_save_url: z.string().url().optional().or(z.literal('')),
  smart_link: z.string().url().optional().or(z.literal('')),
  spotify_url: z.string().url().optional().or(z.literal('')),
  apple_music_url: z.string().url().optional().or(z.literal('')),
  audiomack_url: z.string().url().optional().or(z.literal('')),
  boomplay_url: z.string().url().optional().or(z.literal('')),
  youtube_url: z.string().url().optional().or(z.literal('')),
  status: z.enum(['planning', 'submitted', 'approved', 'live']).optional(),
});

export const updateReleaseSchema = createReleaseSchema.partial().omit({ song_id: true });

export const createReleaseTaskSchema = z.object({
  task_name: z.string().min(1),
  task_category: z.enum([
    'registration',
    'distribution',
    'content',
    'marketing',
    'sync',
    'royalty',
  ]),
  status: z.enum(['todo', 'doing', 'done', 'blocked']).optional(),
  due_date: z.string().optional(),
  notes: z.string().optional(),
});

export const updateReleaseTaskSchema = createReleaseTaskSchema.partial();

export type CreateReleaseInput = z.infer<typeof createReleaseSchema>;
export type UpdateReleaseInput = z.infer<typeof updateReleaseSchema>;
export type CreateReleaseTaskInput = z.infer<typeof createReleaseTaskSchema>;
export type UpdateReleaseTaskInput = z.infer<typeof updateReleaseTaskSchema>;

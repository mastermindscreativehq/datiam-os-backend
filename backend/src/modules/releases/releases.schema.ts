import { z } from 'zod';

const urlField = z.string().url().optional().or(z.literal('')).or(z.null());

export const createReleaseSchema = z.object({
  artist_id: z.string().uuid(),
  title: z.string().min(1).max(200),
  slug: z.string().min(1).max(200).optional(),
  type: z.enum(['single', 'ep', 'album']),
  status: z.enum(['draft', 'scheduled', 'released']).default('draft'),
  genre: z.string().optional(),
  release_date: z.string().optional(),
  cover_art_url: urlField,
  description: z.string().optional(),
  upc: z.string().optional(),
  total_tracks: z.number().int().positive().optional(),
});

export const updateReleaseSchema = createReleaseSchema.partial().omit({ artist_id: true });

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

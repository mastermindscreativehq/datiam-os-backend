import { z } from 'zod';

const urlField = z.string().url().optional().or(z.literal('')).or(z.null());

export const createReleaseSchema = z.object({
  // artist_id is optional — releases can be created before an artist profile is linked
  artist_id: z.string().uuid().optional(),
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
  // Legacy fields — kept for backward compat with old clients
  song_id: z.string().uuid().nullable().optional(),
  distributor: z.string().optional(),
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

export const updateChecklistSchema = z.object({
  lyrics_ready:       z.boolean().optional(),
  cover_art_ready:    z.boolean().optional(),
  mix_ready:          z.boolean().optional(),
  master_ready:       z.boolean().optional(),
  metadata_ready:     z.boolean().optional(),
  isrc_ready:         z.boolean().optional(),
  upc_ready:          z.boolean().optional(),
  distributor_ready:  z.boolean().optional(),
  release_date_ready: z.boolean().optional(),
  promo_assets_ready: z.boolean().optional(),
  sync_assets_ready:  z.boolean().optional(),
  final_approval:     z.boolean().optional(),
  notes:              z.string().nullable().optional(),
});

export type CreateReleaseInput = z.infer<typeof createReleaseSchema>;
export type UpdateReleaseInput = z.infer<typeof updateReleaseSchema>;
export type CreateReleaseTaskInput = z.infer<typeof createReleaseTaskSchema>;
export type UpdateReleaseTaskInput = z.infer<typeof updateReleaseTaskSchema>;
export type UpdateChecklistInput = z.infer<typeof updateChecklistSchema>;

import { z } from 'zod';

export const createSongSchema = z.object({
  artist_id: z.string().uuid(),
  title: z.string().min(1),
  alternate_title: z.string().optional(),
  version: z.string().optional(),
  isrc: z.string().optional(),
  bpm: z.number().int().positive().optional(),
  key: z.string().optional(),
  genre: z.string().optional(),
  mood: z.string().optional(),
  energy_level: z.number().int().min(1).max(10).optional(),
  explicit: z.boolean().optional(),
  lyrics: z.string().optional(),
  master_owner: z.string().optional(),
  publishing_owner: z.string().optional(),
  release_status: z
    .enum(['draft', 'registered', 'distributed', 'released', 'archived'])
    .optional(),
  sync_ready: z.boolean().optional(),
});

export const updateSongSchema = createSongSchema.partial().omit({ artist_id: true });

export const createAssetSchema = z.object({
  asset_type: z.enum([
    'wav',
    'mp3',
    'stem',
    'instrumental',
    'clean',
    'acapella',
    'cover_art',
    'visualizer',
    'lyrics_doc',
  ]),
  file_url: z.string().url(),
  storage_provider: z.string().optional(),
  notes: z.string().optional(),
});

export const createContributorSchema = z.object({
  name: z.string().min(1),
  role: z.enum([
    'writer',
    'producer',
    'composer',
    'mixer',
    'mastering_engineer',
    'featured_artist',
  ]),
  ownership_percentage: z.number().min(0).max(100).optional(),
  publishing_percentage: z.number().min(0).max(100).optional(),
  master_percentage: z.number().min(0).max(100).optional(),
  pro_affiliation: z.string().optional(),
  ipi_number: z.string().optional(),
});

export type CreateSongInput = z.infer<typeof createSongSchema>;
export type UpdateSongInput = z.infer<typeof updateSongSchema>;
export type CreateAssetInput = z.infer<typeof createAssetSchema>;
export type CreateContributorInput = z.infer<typeof createContributorSchema>;

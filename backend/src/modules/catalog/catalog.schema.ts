import { z } from 'zod';

const urlField = z.string().url().optional().or(z.literal('')).or(z.null());
const aiScore = z.number().min(0).max(1).optional();

export const createSongSchema = z.object({
  // Required
  artist_id: z.string().uuid(),
  title: z.string().min(1).max(200),
  // Release link (nullable — standalone songs have no release)
  release_id: z.string().uuid().nullable().optional(),
  // Music Core v1 metadata
  slug: z.string().min(1).max(200).optional(),
  genre: z.string().optional(),
  bpm: z.number().int().positive().max(300).optional(),
  musical_key: z.string().optional(),
  duration_seconds: z.number().int().positive().optional(),
  lyrics: z.string().optional(),
  // Media
  audio_url: urlField,
  waveform_url: urlField,
  cover_art_url: urlField,
  // Tagging
  mood: z.string().optional(),
  language: z.string().optional(),
  explicit: z.boolean().optional(),
  track_number: z.number().int().positive().optional(),
  disk_number: z.number().int().positive().optional(),
  isrc: z.string().optional(),
  status: z
    .enum(['draft', 'registered', 'distributed', 'released', 'archived'])
    .optional(),
  // AI intelligence scores (0.00–1.00)
  energy_score: aiScore,
  emotion_score: aiScore,
  viral_score: aiScore,
  commercial_score: aiScore,
  spiritual_score: aiScore,
  // Legacy fields (still accepted)
  alternate_title: z.string().optional(),
  version: z.string().optional(),
  energy_level: z.number().int().min(1).max(10).optional(),
  master_owner: z.string().optional(),
  publishing_owner: z.string().optional(),
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

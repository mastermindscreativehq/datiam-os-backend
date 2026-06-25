import { z } from 'zod';

// ── Artist schemas ──────────────────────────────────────────────────────────

export const createArtistSchema = z.object({
  stage_name: z.string().min(1),
  legal_name: z.string().optional(),
  biography: z.string().optional(),
  genres: z.array(z.string()).optional().default([]),
  countries: z.array(z.string()).optional().default([]),
  social_links: z.record(z.string()).optional(),
  profile_image: z.string().url().optional().or(z.literal('')),
  catalog_status: z.enum(['active', 'inactive', 'archived']).optional().default('active'),
});

export const updateArtistSchema = z.object({
  stage_name: z.string().min(1).optional(),
  legal_name: z.string().optional(),
  biography: z.string().optional(),
  genres: z.array(z.string()).optional(),
  countries: z.array(z.string()).optional(),
  social_links: z.record(z.string()).optional(),
  profile_image: z.string().optional(),
  catalog_status: z.enum(['active', 'inactive', 'archived']).optional(),
  is_active: z.boolean().optional(),
});

// ── Song schemas ────────────────────────────────────────────────────────────

export const createSongSchemaV2 = z.object({
  artist_id: z.string().uuid(),
  title: z.string().min(1),
  writers: z.array(z.string()).optional().default([]),
  producers: z.array(z.string()).optional().default([]),
  bpm: z.number().int().positive().optional(),
  musical_key: z.string().optional(),
  duration_seconds: z.number().int().positive().optional(),
  language: z.string().optional(),
  explicit: z.boolean().optional().default(false),
  lyrics: z.string().optional(),
  mood: z.string().optional(),
  tags: z.array(z.string()).optional().default([]),
  genre: z.string().optional(),
  release_status: z
    .enum(['draft', 'registered', 'distributed', 'released', 'archived'])
    .optional()
    .default('draft'),
  isrc: z.string().optional(),
});

export const updateSongSchemaV2 = z.object({
  title: z.string().min(1).optional(),
  writers: z.array(z.string()).optional(),
  producers: z.array(z.string()).optional(),
  bpm: z.number().int().positive().optional(),
  musical_key: z.string().optional(),
  duration_seconds: z.number().int().positive().optional(),
  language: z.string().optional(),
  explicit: z.boolean().optional(),
  lyrics: z.string().optional(),
  mood: z.string().optional(),
  tags: z.array(z.string()).optional(),
  genre: z.string().optional(),
  release_status: z
    .enum(['draft', 'registered', 'distributed', 'released', 'archived'])
    .optional(),
  isrc: z.string().optional(),
  audio_url: z.string().optional(),
  cover_art_url: z.string().optional(),
});

// ── Release schemas ─────────────────────────────────────────────────────────

export const createReleaseSchemaV2 = z.object({
  artist_id: z.string().uuid(),
  title: z.string().min(1),
  catalog_release_type: z
    .enum(['single', 'ep', 'album', 'mixtape', 'compilation'])
    .optional()
    .default('single'),
  release_date: z.string().optional(),
  preorder_date: z.string().optional(),
  cover_art_url: z.string().optional(),
  upc: z.string().optional(),
  distributor: z.string().optional(),
  genre: z.string().optional(),
  description: z.string().optional(),
});

export const updateReleaseSchemaV2 = z.object({
  title: z.string().min(1).optional(),
  catalog_release_type: z
    .enum(['single', 'ep', 'album', 'mixtape', 'compilation'])
    .optional(),
  release_date: z.string().optional(),
  preorder_date: z.string().optional(),
  cover_art_url: z.string().optional(),
  upc: z.string().optional(),
  distributor: z.string().optional(),
  genre: z.string().optional(),
  description: z.string().optional(),
  status: z.enum(['planning', 'submitted', 'approved', 'live']).optional(),
});

// ── Track schemas ───────────────────────────────────────────────────────────

export const createTrackSchema = z.object({
  song_id: z.string().uuid(),
  track_number: z.number().int().positive().optional().default(1),
  is_single: z.boolean().optional().default(false),
});

// ── Artwork schemas ─────────────────────────────────────────────────────────

export const createArtworkSchema = z.object({
  release_id: z.string().uuid().optional(),
  song_id: z.string().uuid().optional(),
  artwork_type: z.enum(['cover', 'social', 'animated', 'thumbnail']),
  storage_url: z.string().min(1),
  filename: z.string().optional(),
  file_size_bytes: z.number().int().optional(),
  width_px: z.number().int().optional(),
  height_px: z.number().int().optional(),
  format: z.string().optional(),
  storage_provider: z.string().optional().default('supabase'),
});

// ── Credit schemas ──────────────────────────────────────────────────────────

export const createCreditSchema = z.object({
  name: z.string().min(1),
  role: z.enum([
    'writer',
    'producer',
    'engineer',
    'composer',
    'featured_artist',
    'publisher',
    'mixer',
    'mastering_engineer',
    'lyricist',
    'arranger',
  ]),
  split_percentage: z.number().min(0).max(100).optional(),
  pro_affiliation: z.string().optional(),
  ipi_number: z.string().optional(),
  isni: z.string().optional(),
  notes: z.string().optional(),
});

export const updateCreditSchema = createCreditSchema.partial();

// ── Document schemas ────────────────────────────────────────────────────────

export const createDocumentSchema = z.object({
  document_type: z.enum([
    'split_sheet',
    'contract',
    'lyric_sheet',
    'publishing_agreement',
    'copyright_certificate',
  ]),
  title: z.string().min(1),
  storage_url: z.string().min(1),
  filename: z.string().optional(),
  file_size_bytes: z.number().int().optional(),
  notes: z.string().optional(),
});

// ── Identifier schemas ──────────────────────────────────────────────────────

export const createIdentifierSchema = z.object({
  identifier_type: z.enum(['isrc', 'upc', 'iswc', 'catalog_number']),
  value: z.string().min(1),
  assigned_by: z.string().optional(),
  assigned_at: z.string().optional(),
});

// ── Query schemas ───────────────────────────────────────────────────────────

export const catalogQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(20),
  search: z.string().optional(),
  artist_id: z.string().uuid().optional(),
  status: z.string().optional(),
  genre: z.string().optional(),
  sort: z.string().optional().default('created_at'),
  order: z.enum(['asc', 'desc']).optional().default('desc'),
}).partial();

// ── Types ───────────────────────────────────────────────────────────────────

export type CreateArtistInput = z.infer<typeof createArtistSchema>;
export type UpdateArtistInput = z.infer<typeof updateArtistSchema>;
export type CreateSongInputV2 = z.infer<typeof createSongSchemaV2>;
export type UpdateSongInputV2 = z.infer<typeof updateSongSchemaV2>;
export type CreateReleaseInputV2 = z.infer<typeof createReleaseSchemaV2>;
export type UpdateReleaseInputV2 = z.infer<typeof updateReleaseSchemaV2>;
export type CreateTrackInput = z.infer<typeof createTrackSchema>;
export type CreateArtworkInput = z.infer<typeof createArtworkSchema>;
export type CreateCreditInput = z.infer<typeof createCreditSchema>;
export type UpdateCreditInput = z.infer<typeof updateCreditSchema>;
export type CreateDocumentInput = z.infer<typeof createDocumentSchema>;
export type CreateIdentifierInput = z.infer<typeof createIdentifierSchema>;
export type CatalogQuery = z.infer<typeof catalogQuerySchema>;

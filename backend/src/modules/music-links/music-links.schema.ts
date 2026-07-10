import { z } from 'zod';

export const MUSIC_LINK_CATEGORIES = [
  'music_platform',
  'social_media',
  'smart_link',
  'pre_save',
  'business',
  'distribution',
  'other',
] as const;

const ownerRefine = (data: { artist_id?: string | null; release_id?: string | null }) =>
  Boolean(data.artist_id) !== Boolean(data.release_id);

export const createMusicLinkSchema = z
  .object({
    artist_id: z.string().uuid().optional(),
    release_id: z.string().uuid().optional(),
    link_category: z.enum(MUSIC_LINK_CATEGORIES),
    platform: z.string().min(1),
    url: z.string().url(),
    label: z.string().optional(),
    is_primary: z.boolean().optional().default(false),
    is_active: z.boolean().optional().default(true),
    territory: z.string().optional(),
    display_order: z.number().int().optional().default(0),
    metadata: z.record(z.unknown()).optional().default({}),
  })
  .refine(ownerRefine, {
    message: 'Exactly one of artist_id or release_id must be set',
  });

export const updateMusicLinkSchema = z.object({
  link_category: z.enum(MUSIC_LINK_CATEGORIES).optional(),
  platform: z.string().min(1).optional(),
  url: z.string().url().optional(),
  label: z.string().optional(),
  is_primary: z.boolean().optional(),
  is_active: z.boolean().optional(),
  territory: z.string().optional(),
  display_order: z.number().int().optional(),
  metadata: z.record(z.unknown()).optional(),
});

export const reorderMusicLinksSchema = z.array(
  z.object({
    id: z.string().uuid(),
    display_order: z.number().int(),
  }),
).min(1);

export const musicLinkQuerySchema = z.object({
  artist_id: z.string().uuid().optional(),
  release_id: z.string().uuid().optional(),
  link_category: z.enum(MUSIC_LINK_CATEGORIES).optional(),
  platform: z.string().optional(),
  is_active: z.enum(['true', 'false']).optional(),
});

export type CreateMusicLinkInput = z.infer<typeof createMusicLinkSchema>;
export type UpdateMusicLinkInput = z.infer<typeof updateMusicLinkSchema>;
export type ReorderMusicLinksInput = z.infer<typeof reorderMusicLinksSchema>;
export type MusicLinkQuery = z.infer<typeof musicLinkQuerySchema>;

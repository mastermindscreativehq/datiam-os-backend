import { z } from 'zod';

const socialLinksSchema = z.object({
  instagram: z.string().optional(),
  tiktok: z.string().optional(),
  youtube: z.string().optional(),
  spotify: z.string().optional(),
  website: z.string().optional(),
}).optional();

export const createArtistSchema = z.object({
  stage_name: z.string().min(1),
  legal_name: z.string().optional(),
  bio: z.string().optional(),
  genre: z.string().optional(),
  country: z.string().optional(),
  primary_color: z.string().optional(),
  mood_profile: z.string().optional(),
  social_links: socialLinksSchema,
  profile_image: z.string().optional(),
  is_active: z.boolean().optional(),
});

export const updateArtistSchema = createArtistSchema.partial();

export type CreateArtistInput = z.infer<typeof createArtistSchema>;
export type UpdateArtistInput = z.infer<typeof updateArtistSchema>;

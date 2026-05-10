import { z } from 'zod';

export const createArtistSchema = z.object({
  stage_name: z.string().min(1),
  legal_name: z.string().optional(),
  bio: z.string().optional(),
  country: z.string().optional(),
  genre_primary: z.string().optional(),
  genre_secondary: z.string().optional(),
  brand_statement: z.string().optional(),
});

export const updateArtistSchema = createArtistSchema.partial();

export type CreateArtistInput = z.infer<typeof createArtistSchema>;
export type UpdateArtistInput = z.infer<typeof updateArtistSchema>;

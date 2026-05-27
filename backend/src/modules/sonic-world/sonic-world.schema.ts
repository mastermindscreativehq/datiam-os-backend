import { z } from 'zod';

export const generateBlueprintSchema = z.object({
  session_id: z.string().uuid(),
  artist_id:  z.string().uuid(),
});

export type GenerateBlueprintInput = z.infer<typeof generateBlueprintSchema>;

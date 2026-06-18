import { z } from 'zod';

export const resolveOutcomeSchema = z.object({
  prediction_id:     z.string().uuid(),
  actual_result:     z.string().min(1),
  revenue_generated: z.number().min(0).optional(),
  notes:             z.string().optional(),
});

export type ResolveOutcomeInput = z.infer<typeof resolveOutcomeSchema>;

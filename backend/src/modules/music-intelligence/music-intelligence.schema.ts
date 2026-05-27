import { z } from 'zod';

export const EMOTIONS = [
  'grief', 'trauma', 'rage', 'joy', 'melancholy', 'euphoria',
  'anxiety', 'longing', 'triumph', 'nostalgia', 'peace', 'defiance',
] as const;

export const INTENTIONS = [
  'heal_listener', 'inspire_action', 'create_nostalgia', 'deliver_message',
  'uplift_spirit', 'provoke_thought', 'celebrate_truth', 'process_pain',
] as const;

export const TRANSFORMATIONS = [
  'from_pain_to_peace', 'from_stagnation_to_momentum', 'from_confusion_to_clarity',
  'from_isolation_to_belonging', 'from_fear_to_courage', 'from_grief_to_acceptance',
  'from_doubt_to_conviction', 'from_chaos_to_order',
] as const;

export const createSessionSchema = z.object({
  name: z.string().min(1).max(200),
  artist_id: z.string().uuid(),
  emotion: z.enum(EMOTIONS),
  intention: z.enum(INTENTIONS),
  story: z.string().max(2000).optional(),
  listener_transformation: z.enum(TRANSFORMATIONS),
});

export const updateSessionSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  status: z.enum(['draft', 'active', 'completed']).optional(),
});

export type CreateSessionInput = z.infer<typeof createSessionSchema>;
export type UpdateSessionInput = z.infer<typeof updateSessionSchema>;

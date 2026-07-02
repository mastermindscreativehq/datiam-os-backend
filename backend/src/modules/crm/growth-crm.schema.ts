import { z } from 'zod';

export const createGroupSchema = z.object({
  artist_id: z.string().uuid().optional(),
  name: z.string().min(1).max(100),
  description: z.string().optional(),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
  criteria: z.record(z.unknown()).optional(),
});

export const updateGroupSchema = createGroupSchema.partial();

export const logConversationSchema = z.object({
  channel: z.enum(['email', 'dm', 'call', 'meeting', 'whatsapp', 'other']),
  direction: z.enum(['inbound', 'outbound']),
  subject: z.string().optional(),
  body: z.string().min(1),
  sent_at: z.string().datetime().optional(),
  metadata: z.record(z.unknown()).optional(),
});

export const groupFilterSchema = z.object({
  artist_id: z.string().uuid().optional(),
});

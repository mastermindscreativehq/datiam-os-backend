import { z } from 'zod';

export const notificationFilterSchema = z.object({
  unread_only: z.coerce.boolean().optional(),
  category: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
  offset: z.coerce.number().int().min(0).optional(),
});

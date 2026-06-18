import { z } from 'zod';

export const ingestReplySchema = z.object({
  campaign_id: z.string().uuid('campaign_id must be a valid UUID'),
  contact_id:  z.string().uuid('contact_id must be a valid UUID').optional(),
  subject:     z.string().min(1).max(500),
  body:        z.string().min(1).max(50000),
});

export type IngestReplyInput = z.infer<typeof ingestReplySchema>;

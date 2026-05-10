import { z } from 'zod';

export const webhookSchema = z.object({
  workflow_name: z.string().min(1),
  source: z.enum(['backend', 'n8n', 'cron', 'manual']).optional().default('n8n'),
  payload: z.record(z.unknown()).optional(),
});

export type WebhookInput = z.infer<typeof webhookSchema>;

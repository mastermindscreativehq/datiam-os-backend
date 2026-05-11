import { z } from 'zod';

export const webhookSchema = z.object({
  workflow_name: z.string().min(1),
  source: z.enum(['backend', 'n8n', 'cron', 'manual']).optional().default('n8n'),
  payload: z.record(z.unknown()).optional(),
});

export const createRunSchema = z.object({
  workflow_name: z.string().min(1),
  source: z.enum(['backend', 'n8n', 'cron', 'manual']).default('manual'),
  status: z.enum(['success', 'failed', 'running']).default('success'),
  payload: z.record(z.unknown()).optional(),
  result: z.record(z.unknown()).optional(),
});

export type WebhookInput = z.infer<typeof webhookSchema>;
export type CreateRunInput = z.infer<typeof createRunSchema>;

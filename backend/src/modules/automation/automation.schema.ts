import { z } from 'zod';

// ── Automation Run schemas ──────────────────────────────────────────────────

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

export const updateRunSchema = z.object({
  status: z.enum(['success', 'failed', 'running']),
  result: z.record(z.unknown()).optional(),
});

export const runHistoryQuerySchema = z.object({
  status: z.enum(['success', 'failed', 'running']).optional(),
  source: z.enum(['backend', 'n8n', 'cron', 'manual']).optional(),
  event: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(200).optional().default(50),
  offset: z.coerce.number().int().min(0).optional().default(0),
});

// ── Workflow Registry schemas ───────────────────────────────────────────────

const retryPolicySchema = z.object({
  max_retries: z.number().int().min(0).max(10),
  backoff: z.enum(['exponential', 'linear']),
  base_delay_ms: z.number().int().min(0),
});

export const createWorkflowSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().optional(),
  event_triggers: z.array(z.string()).min(1),
  n8n_workflow_id: z.string().optional(),
  webhook_path: z.string().optional(),
  is_active: z.boolean().optional().default(true),
  metadata: z.record(z.unknown()).optional(),
  retry_policy: retryPolicySchema.optional(),
  timeout_ms: z.number().int().min(1000).max(60_000).optional(),
  priority: z.number().int().optional(),
  required_inputs: z.array(z.string()).optional(),
  expected_outputs: z.array(z.string()).optional(),
  version: z.string().optional(),
});

export const updateWorkflowSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().optional(),
  event_triggers: z.array(z.string()).optional(),
  n8n_workflow_id: z.string().optional(),
  webhook_path: z.string().optional(),
  is_active: z.boolean().optional(),
  metadata: z.record(z.unknown()).optional(),
  retry_policy: retryPolicySchema.optional(),
  timeout_ms: z.number().int().min(1000).max(60_000).optional(),
  priority: z.number().int().optional(),
  required_inputs: z.array(z.string()).optional(),
  expected_outputs: z.array(z.string()).optional(),
  version: z.string().optional(),
});

export const triggerWorkflowSchema = z.object({
  event: z.string().min(1),
  data: z.record(z.unknown()).optional().default({}),
});

// ── Types ───────────────────────────────────────────────────────────────────

export type WebhookInput       = z.infer<typeof webhookSchema>;
export type CreateRunInput     = z.infer<typeof createRunSchema>;
export type UpdateRunInput     = z.infer<typeof updateRunSchema>;
export type RunHistoryQuery    = z.infer<typeof runHistoryQuerySchema>;
export type CreateWorkflowInput = z.infer<typeof createWorkflowSchema>;
export type UpdateWorkflowInput = z.infer<typeof updateWorkflowSchema>;
export type TriggerWorkflowInput = z.infer<typeof triggerWorkflowSchema>;

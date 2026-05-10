import { z } from 'zod';

const JOB_TYPES = [
  'fan_sync',
  'release_reminder',
  'content_suggestion',
  'royalty_import',
  'sync_follow_up',
  'analytics_snapshot',
] as const;

export const createJobSchema = z.object({
  job_name: z.string().min(1).max(100),
  job_type: z.enum(JOB_TYPES),
  cron_expression: z.string().optional(),
  run_once_at: z.string().datetime().optional(),
  payload: z.record(z.unknown()).optional(),
}).refine(
  (d) => d.cron_expression || d.run_once_at,
  { message: 'Either cron_expression or run_once_at is required' },
);

export const updateJobSchema = z.object({
  job_name: z.string().min(1).max(100).optional(),
  status: z.enum(['active', 'paused']).optional(),
  cron_expression: z.string().optional(),
  payload: z.record(z.unknown()).optional(),
});

export type CreateJobInput = z.infer<typeof createJobSchema>;
export type UpdateJobInput = z.infer<typeof updateJobSchema>;

import { z } from 'zod';

export const analyzeReleaseSchema = z.object({
  force: z.boolean().optional().default(false),
});

export const updateMissionSchema = z
  .object({
    status: z.enum(['pending', 'active', 'blocked', 'completed', 'cancelled']).optional(),
    progress_percentage: z.number().min(0).max(100).optional(),
    due_date: z.string().optional().nullable(),
    priority: z.number().int().optional(),
  })
  .refine((obj) => Object.keys(obj).length > 0, { message: 'At least one field must be provided' });

export type AnalyzeReleaseInput = z.infer<typeof analyzeReleaseSchema>;
export type UpdateMissionInput = z.infer<typeof updateMissionSchema>;

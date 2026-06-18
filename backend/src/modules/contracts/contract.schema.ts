import { z } from 'zod';

export const createContractSchema = z.object({
  deal_id:            z.string().uuid().optional(),
  company_id:         z.string().uuid().optional(),
  contact_id:         z.string().uuid().optional(),
  contract_title:     z.string().min(1).max(255),
  contract_type:      z.string().optional(),
  contract_value:     z.number().positive().optional(),
  currency:           z.string().default('USD'),
  expires_at:         z.string().optional(),
  file_url:           z.string().url().optional(),
  signature_provider: z.string().optional(),
});

export const sendContractSchema = z.object({
  contract_id: z.string().uuid(),
});

export const updateContractStatusSchema = z.object({
  status: z.enum(['draft', 'generated', 'sent', 'viewed', 'signed', 'expired', 'cancelled']),
});

export type CreateContractInput       = z.infer<typeof createContractSchema>;
export type SendContractInput         = z.infer<typeof sendContractSchema>;
export type UpdateContractStatusInput = z.infer<typeof updateContractStatusSchema>;

import { z } from 'zod';

export const createDealSchema = z.object({
  meeting_id:          z.string().uuid().optional(),
  campaign_id:         z.string().uuid().optional(),
  contact_id:          z.string().uuid().optional(),
  company_id:          z.string().uuid().optional(),
  deal_name:           z.string().min(1).max(255),
  deal_type:           z.string().optional(),
  projected_value:     z.number().positive().optional(),
  expected_close_date: z.string().optional(),
  notes:               z.string().optional(),
});

export const updateDealSchema = z.object({
  deal_name:           z.string().min(1).max(255).optional(),
  deal_type:           z.string().optional(),
  projected_value:     z.number().positive().optional(),
  actual_value:        z.number().positive().optional(),
  expected_close_date: z.string().optional(),
  notes:               z.string().optional(),
});

export const updateDealStageSchema = z.object({
  stage: z.enum([
    'lead',
    'contacted',
    'replied',
    'meeting_scheduled',
    'meeting_completed',
    'proposal_sent',
    'negotiation',
    'contract_sent',
    'contract_signed',
    'won',
    'lost',
  ]),
});

export const updateDealStatusSchema = z.object({
  status: z.enum(['open', 'won', 'lost', 'cancelled']),
});

export type CreateDealInput         = z.infer<typeof createDealSchema>;
export type UpdateDealInput         = z.infer<typeof updateDealSchema>;
export type UpdateDealStageInput    = z.infer<typeof updateDealStageSchema>;
export type UpdateDealStatusInput   = z.infer<typeof updateDealStatusSchema>;

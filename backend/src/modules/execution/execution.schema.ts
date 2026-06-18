import { z } from 'zod';

export const sendCampaignSchema = z.object({
  campaign_id: z.string().uuid('campaign_id must be a valid UUID'),
  provider:    z.enum(['smtp', 'sendgrid', 'resend']).optional(),
  subject:     z.string().min(1).max(500).optional(),
});

export type SendCampaignInput = z.infer<typeof sendCampaignSchema>;

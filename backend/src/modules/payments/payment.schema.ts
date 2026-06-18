import { z } from 'zod';

export const createPaymentSchema = z.object({
  contract_id:           z.string().uuid().optional(),
  deal_id:               z.string().uuid().optional(),
  company_id:            z.string().uuid().optional(),
  contact_id:            z.string().uuid().optional(),
  payment_amount:        z.number().positive(),
  currency:              z.string().default('USD'),
  due_date:              z.string().optional(),
  notes:                 z.string().optional(),
});

export const sendInvoiceSchema = z.object({
  payment_id: z.string().uuid(),
});

export const recordPaymentSchema = z.object({
  payment_id:            z.string().uuid(),
  amount_paid:           z.number().positive().optional(),
  payment_method:        z.string().optional(),
  transaction_reference: z.string().optional(),
  notes:                 z.string().optional(),
});

export const updatePaymentStatusSchema = z.object({
  status: z.enum(['pending', 'invoice_sent', 'partial', 'paid', 'overdue', 'refunded', 'cancelled']),
});

export type CreatePaymentInput       = z.infer<typeof createPaymentSchema>;
export type SendInvoiceInput         = z.infer<typeof sendInvoiceSchema>;
export type RecordPaymentInput       = z.infer<typeof recordPaymentSchema>;
export type UpdatePaymentStatusInput = z.infer<typeof updatePaymentStatusSchema>;

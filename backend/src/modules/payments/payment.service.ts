import { eq, desc, sql, and, lt, inArray } from 'drizzle-orm';
import { db } from '../../db';
import {
  payments,
  contracts,
  deals,
  companies,
  licensing_contacts,
  meetings,
  reply_log,
  contact_memory,
  company_memory,
  adaptive_weight,
} from '../../db/schema';
import { AppError } from '../../middleware/errorHandler';
import { logActivity } from '../../lib/activityLogger';
import type { CreatePaymentInput, RecordPaymentInput } from './payment.schema';

const ENGINE_VERSION = 'payment-intelligence-v1';

type PaymentStatus = 'pending' | 'invoice_sent' | 'partial' | 'paid' | 'overdue' | 'refunded' | 'cancelled';

// ─── Invoice Number Generator ─────────────────────────────────────────────────

async function generateInvoiceNumber(): Promise<string> {
  const now   = new Date();
  const year  = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const [countRow] = await db.select({ count: sql<number>`count(*)` }).from(payments);
  const seq = String((Number(countRow?.count ?? 0) + 1)).padStart(4, '0');
  return `INV-${year}${month}-${seq}`;
}

// ─── Intelligence Generator ───────────────────────────────────────────────────

interface PaymentIntelligence {
  invoice_summary:        string;
  invoice_amount:         number;
  due_date:               Date;
  payment_recommendation: string;
  metadata:               Record<string, unknown>;
}

async function generatePaymentIntelligence(
  contractId: string | null,
  dealId:     string | null,
  companyId:  string | null,
  contactId:  string | null,
): Promise<PaymentIntelligence> {
  let contractContext: Record<string, unknown> = {};
  let dealContext:     Record<string, unknown> = {};
  let companyContext:  Record<string, unknown> = {};
  let contactContext:  Record<string, unknown> = {};
  let replyContext:    Record<string, unknown> = {};
  let meetingContext:  Record<string, unknown> = {};
  let invoiceAmount   = 0;
  let netDays         = 30;

  if (contractId) {
    const [contract] = await db.select().from(contracts)
      .where(eq(contracts.id, contractId)).limit(1);
    if (contract) {
      invoiceAmount = parseFloat(String(contract.contract_value ?? '0'));
      contractContext = {
        contract_id:    contract.id,
        contract_title: contract.contract_title,
        contract_type:  contract.contract_type,
        contract_value: contract.contract_value,
        currency:       contract.currency,
        status:         contract.status,
        signed_at:      contract.signed_at,
      };
      if (!dealId && contract.deal_id)    dealId    = contract.deal_id;
      if (!companyId && contract.company_id) companyId = contract.company_id;
      if (!contactId && contract.contact_id) contactId = contract.contact_id;
    }
  }

  if (dealId) {
    const [deal] = await db.select().from(deals)
      .where(eq(deals.id, dealId)).limit(1);
    if (deal) {
      if (invoiceAmount === 0) {
        invoiceAmount = parseFloat(String(deal.actual_value ?? deal.projected_value ?? '0'));
      }
      dealContext = {
        deal_id:         deal.id,
        deal_name:       deal.deal_name,
        deal_type:       deal.deal_type,
        stage:           deal.stage,
        status:          deal.status,
        actual_value:    deal.actual_value,
        projected_value: deal.projected_value,
        win_probability: deal.win_probability,
      };

      if (deal.meeting_id) {
        const [meeting] = await db.select().from(meetings)
          .where(eq(meetings.id, deal.meeting_id)).limit(1);
        if (meeting) {
          meetingContext = {
            meeting_id:    meeting.id,
            meeting_title: meeting.meeting_title,
            meeting_type:  meeting.meeting_type,
            status:        meeting.status,
            scheduled_at:  meeting.scheduled_at,
          };
        }
      }
    }
  }

  if (companyId) {
    const [company] = await db.select().from(companies)
      .where(eq(companies.id, companyId)).limit(1);
    if (company) {
      companyContext = {
        company_id: company.id,
        name:       company.name,
        type:       company.type,
        tier:       company.tier,
        country:    company.country,
      };
      if (company.tier === 'tier_a')      netDays = 30;
      else if (company.tier === 'tier_b') netDays = 45;
      else                                netDays = 60;
    }
  }

  if (contactId) {
    const [contact] = await db.select().from(licensing_contacts)
      .where(eq(licensing_contacts.id, contactId)).limit(1);
    if (contact) {
      contactContext = {
        contact_id: contact.id,
        full_name:  contact.full_name,
        email:      contact.email,
        role:       contact.role,
      };
    }

    const [latestReply] = await db.select().from(reply_log)
      .where(and(
        eq(reply_log.contact_id, contactId),
        sql`${reply_log.status} IN ('positive','interested','meeting_requested')`,
      ))
      .orderBy(desc(reply_log.created_at))
      .limit(1);

    if (latestReply) {
      replyContext = {
        reply_id:   latestReply.id,
        status:     latestReply.status,
        confidence: latestReply.confidence,
      };
    }
  }

  const dueDate = new Date();
  dueDate.setDate(dueDate.getDate() + netDays);

  const invoiceSummary = buildInvoiceSummary(
    contractContext, dealContext, companyContext, contactContext, invoiceAmount, netDays,
  );

  const recommendation = buildPaymentRecommendation(companyContext, dealContext, invoiceAmount);

  return {
    invoice_summary:        invoiceSummary,
    invoice_amount:         invoiceAmount,
    due_date:               dueDate,
    payment_recommendation: recommendation,
    metadata: {
      contract_context: contractContext,
      deal_context:     dealContext,
      company_context:  companyContext,
      contact_context:  contactContext,
      reply_context:    replyContext,
      meeting_context:  meetingContext,
      net_days:         netDays,
      engine_version:   ENGINE_VERSION,
      generated_at:     new Date().toISOString(),
    },
  };
}

function buildInvoiceSummary(
  contract: Record<string, unknown>,
  deal:     Record<string, unknown>,
  company:  Record<string, unknown>,
  contact:  Record<string, unknown>,
  amount:   number,
  netDays:  number,
): string {
  const parts: string[] = [];
  const dealName    = (deal.deal_name     as string) || (contract.contract_title as string) || 'Unnamed Deal';
  const companyName = (company.name       as string) || 'Unknown Company';
  const contactName = (contact.full_name  as string) || 'Unknown Contact';
  const formatted   = amount > 0
    ? `$${amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}`
    : 'TBD';

  parts.push(`Invoice for ${dealName} — ${companyName}.`);
  parts.push(`Billed to: ${contactName}.`);
  parts.push(`Amount due: ${formatted} (Net ${netDays}).`);
  if (deal.deal_type) parts.push(`Deal type: ${deal.deal_type}.`);

  return parts.join(' ');
}

function buildPaymentRecommendation(
  company: Record<string, unknown>,
  deal:    Record<string, unknown>,
  amount:  number,
): string {
  const tier     = (company.tier as string) || 'standard';
  const dealType = (deal.deal_type as string) || null;

  if (amount > 50000) {
    return 'High-value payment — consider escrow or installment arrangement. Follow up within 48 hours of invoice delivery.';
  }
  if (tier === 'tier_a') {
    return 'Tier A partner — standard Net 30 terms apply. Payment typically received within 20 days.';
  }
  if (tier === 'tier_b') {
    return 'Tier B partner — Net 45 terms apply. Send reminder at day 30 if outstanding.';
  }
  if (dealType === 'sync' || dealType === 'licensing') {
    return 'Sync/licensing deal — confirm delivery of licensed assets before issuing invoice.';
  }
  return 'Standard payment terms apply. Follow up at 50% of due-date window if unpaid.';
}

// ─── Memory Updates ───────────────────────────────────────────────────────────

async function updateContactMemoryPayments(
  contactId: string,
  event:     'created' | 'paid',
  amount?:   number,
): Promise<void> {
  const [existing] = await db.select().from(contact_memory)
    .where(eq(contact_memory.contact_id, contactId)).limit(1);
  if (!existing) return;

  const patch: Record<string, unknown> = {
    payments_created:  sql`${contact_memory.payments_created} + ${event === 'created' ? 1 : 0}`,
    payments_paid:     sql`${contact_memory.payments_paid}    + ${event === 'paid'    ? 1 : 0}`,
    memory_updated_at: new Date(),
  };
  if (event === 'paid' && amount) {
    patch.revenue_received = sql`${contact_memory.revenue_received} + ${String(amount)}`;
  }

  await db.update(contact_memory).set(patch).where(eq(contact_memory.contact_id, contactId));
}

async function updateCompanyMemoryPayments(
  companyId: string,
  event:     'created' | 'paid',
  amount?:   number,
): Promise<void> {
  const [existing] = await db.select().from(company_memory)
    .where(eq(company_memory.company_id, companyId)).limit(1);
  if (!existing) return;

  const patch: Record<string, unknown> = {
    payments_created:  sql`${company_memory.payments_created} + ${event === 'created' ? 1 : 0}`,
    payments_paid:     sql`${company_memory.payments_paid}    + ${event === 'paid'    ? 1 : 0}`,
    memory_updated_at: new Date(),
  };
  if (event === 'paid' && amount) {
    patch.revenue_received = sql`${company_memory.revenue_received} + ${String(amount)}`;
  }

  await db.update(company_memory).set(patch).where(eq(company_memory.company_id, companyId));
}

// ─── Adaptive Signals ─────────────────────────────────────────────────────────

async function updateAdaptivePaymentSignal(
  factor: 'average_collection_time' | 'revenue_per_company' | 'revenue_per_contact',
): Promise<void> {
  const [existing] = await db.select().from(adaptive_weight)
    .where(eq(adaptive_weight.factor_name, factor)).limit(1);
  if (!existing) return;

  const newSample     = (existing.sample_size ?? 0) + 1;
  const newConfidence = Math.min(1, newSample / 20);
  await db.update(adaptive_weight).set({
    sample_size:          newSample,
    confidence:           String(newConfidence.toFixed(2)),
    last_recalculated_at: new Date(),
    updated_at:           new Date(),
  }).where(eq(adaptive_weight.factor_name, factor));
}

// ─── Auto-create from Signed Contract ────────────────────────────────────────

export const autoCreatePaymentFromContract = async (
  contractId: string,
): Promise<typeof payments.$inferSelect | null> => {
  try {
    const [contract] = await db.select().from(contracts)
      .where(eq(contracts.id, contractId)).limit(1);
    if (!contract) return null;

    // Avoid duplicate pending payments for the same contract
    const [existing] = await db.select({ id: payments.id }).from(payments)
      .where(and(
        eq(payments.contract_id, contractId),
        sql`${payments.payment_status} NOT IN ('cancelled','refunded')`,
      ))
      .limit(1);
    if (existing) return null;

    const intel = await generatePaymentIntelligence(
      contractId,
      contract.deal_id    ?? null,
      contract.company_id ?? null,
      contract.contact_id ?? null,
    );

    const invoiceNumber = await generateInvoiceNumber();

    const [newPayment] = await db.insert(payments).values({
      contract_id:    contractId,
      deal_id:        contract.deal_id    ?? null,
      company_id:     contract.company_id ?? null,
      contact_id:     contract.contact_id ?? null,
      invoice_number: invoiceNumber,
      payment_amount: intel.invoice_amount > 0 ? String(intel.invoice_amount) : '0',
      currency:       contract.currency ?? 'USD',
      payment_status: 'pending',
      due_date:       intel.due_date,
      notes:          intel.invoice_summary,
      metadata:       {
        ...intel.metadata,
        invoice_summary:        intel.invoice_summary,
        payment_recommendation: intel.payment_recommendation,
        auto_generated:         true,
      } as unknown as Record<string, unknown>,
    }).returning();

    if (contract.contact_id) await updateContactMemoryPayments(contract.contact_id, 'created');
    if (contract.company_id) await updateCompanyMemoryPayments(contract.company_id, 'created');
    await updateAdaptivePaymentSignal('average_collection_time');

    logActivity({
      eventType:  'payment_auto_created',
      module:     'payments',
      entityType: 'payment',
      entityId:   newPayment.id,
      title:      `Payment auto-created from signed contract: ${invoiceNumber}`,
      severity:   'info',
      metadata: {
        contract_id:    contractId,
        deal_id:        contract.deal_id,
        company_id:     contract.company_id,
        invoice_amount: intel.invoice_amount,
        due_date:       intel.due_date.toISOString(),
      },
    });

    return newPayment;
  } catch (err) {
    console.error('[PaymentService] autoCreatePaymentFromContract failed:', err);
    return null;
  }
};

// ─── Create Payment (manual) ──────────────────────────────────────────────────

export const createPayment = async (input: CreatePaymentInput) => {
  const contractId = input.contract_id ?? null;
  const dealId     = input.deal_id     ?? null;
  const companyId  = input.company_id  ?? null;
  const contactId  = input.contact_id  ?? null;

  const intel = await generatePaymentIntelligence(contractId, dealId, companyId, contactId);

  const amount    = input.payment_amount;
  const dueDate   = input.due_date ? new Date(input.due_date) : intel.due_date;
  const invoiceNo = await generateInvoiceNumber();

  const [newPayment] = await db.insert(payments).values({
    contract_id:    contractId,
    deal_id:        dealId,
    company_id:     companyId,
    contact_id:     contactId,
    invoice_number: invoiceNo,
    payment_amount: String(amount),
    currency:       input.currency ?? 'USD',
    payment_status: 'pending',
    due_date:       dueDate,
    notes:          input.notes ?? intel.invoice_summary,
    metadata:       {
      ...intel.metadata,
      invoice_summary:        intel.invoice_summary,
      payment_recommendation: intel.payment_recommendation,
    } as unknown as Record<string, unknown>,
  }).returning();

  if (contactId) await updateContactMemoryPayments(contactId, 'created');
  if (companyId) await updateCompanyMemoryPayments(companyId, 'created');
  await updateAdaptivePaymentSignal('average_collection_time');

  logActivity({
    eventType:  'payment_created',
    module:     'payments',
    entityType: 'payment',
    entityId:   newPayment.id,
    title:      `Payment created: ${invoiceNo}`,
    severity:   'info',
    metadata: {
      contract_id:    contractId,
      deal_id:        dealId,
      company_id:     companyId,
      payment_amount: amount,
    },
  });

  return newPayment;
};

// ─── Send Invoice ─────────────────────────────────────────────────────────────

export const sendInvoice = async (paymentId: string) => {
  const [payment] = await db.select().from(payments)
    .where(eq(payments.id, paymentId)).limit(1);
  if (!payment) throw new AppError('Payment not found', 404);

  if (payment.payment_status === 'paid' || payment.payment_status === 'cancelled') {
    throw new AppError(`Cannot send invoice for payment in "${payment.payment_status}" status`, 400);
  }

  const [updated] = await db.update(payments).set({
    payment_status:  'invoice_sent',
    invoice_sent_at: new Date(),
    updated_at:      new Date(),
  }).where(eq(payments.id, paymentId)).returning();

  logActivity({
    eventType:  'invoice_sent',
    module:     'payments',
    entityType: 'payment',
    entityId:   paymentId,
    title:      `Invoice sent: ${payment.invoice_number}`,
    severity:   'info',
    metadata: {
      company_id:  payment.company_id,
      contact_id:  payment.contact_id,
      amount:      payment.payment_amount,
    },
  });

  return updated;
};

// ─── Record Payment ───────────────────────────────────────────────────────────

export const recordPayment = async (input: RecordPaymentInput) => {
  const [payment] = await db.select().from(payments)
    .where(eq(payments.id, input.payment_id)).limit(1);
  if (!payment) throw new AppError('Payment not found', 404);

  if (payment.payment_status === 'paid') {
    throw new AppError('Payment has already been fully paid', 400);
  }
  if (payment.payment_status === 'cancelled' || payment.payment_status === 'refunded') {
    throw new AppError(`Cannot record payment for "${payment.payment_status}" status`, 400);
  }

  const totalAmount  = parseFloat(String(payment.payment_amount ?? '0'));
  const amountPaid   = input.amount_paid ?? totalAmount;
  const isFullyPaid  = amountPaid >= totalAmount;
  const newStatus: PaymentStatus = isFullyPaid ? 'paid' : 'partial';
  const now          = new Date();

  const [updated] = await db.update(payments).set({
    payment_status:        newStatus,
    paid_at:               isFullyPaid ? now : payment.paid_at,
    payment_method:        input.payment_method        ?? payment.payment_method,
    transaction_reference: input.transaction_reference ?? payment.transaction_reference,
    notes:                 input.notes ?? payment.notes,
    updated_at:            now,
  }).where(eq(payments.id, input.payment_id)).returning();

  // Update deal actual_value when fully paid
  if (isFullyPaid && payment.deal_id) {
    await db.update(deals).set({
      actual_value: String(amountPaid),
      updated_at:   now,
    }).where(eq(deals.id, payment.deal_id));
  }

  if (payment.contact_id) await updateContactMemoryPayments(payment.contact_id, 'paid', isFullyPaid ? amountPaid : 0);
  if (payment.company_id) await updateCompanyMemoryPayments(payment.company_id, 'paid', isFullyPaid ? amountPaid : 0);

  if (isFullyPaid) {
    await updateAdaptivePaymentSignal('revenue_per_company');
    await updateAdaptivePaymentSignal('revenue_per_contact');
  }
  await updateAdaptivePaymentSignal('average_collection_time');

  logActivity({
    eventType:  isFullyPaid ? 'payment_received' : 'payment_partial',
    module:     'payments',
    entityType: 'payment',
    entityId:   payment.id,
    title:      `${isFullyPaid ? 'Payment received' : 'Partial payment recorded'}: ${payment.invoice_number}`,
    severity:   'info',
    metadata: {
      amount_paid:  amountPaid,
      total_amount: totalAmount,
      new_status:   newStatus,
      deal_id:      payment.deal_id,
    },
  });

  return updated;
};

// ─── List Payments ────────────────────────────────────────────────────────────

export const listPayments = async (limit = 100) => {
  const rows = await db.select().from(payments)
    .orderBy(desc(payments.created_at)).limit(limit);

  if (!rows.length) {
    return { payments: [], total: 0, fetched_at: new Date().toISOString() };
  }

  const contactIds  = [...new Set(rows.map(r => r.contact_id).filter((id): id is string => id !== null))];
  const companyIds  = [...new Set(rows.map(r => r.company_id).filter((id): id is string => id !== null))];
  const dealIds     = [...new Set(rows.map(r => r.deal_id).filter((id): id is string => id !== null))];
  const contractIds = [...new Set(rows.map(r => r.contract_id).filter((id): id is string => id !== null))];

  const [contactRows, companyRows, dealRows, contractRows] = await Promise.all([
    contactIds.length
      ? db.select({ id: licensing_contacts.id, full_name: licensing_contacts.full_name, email: licensing_contacts.email, role: licensing_contacts.role })
          .from(licensing_contacts)
          .where(inArray(licensing_contacts.id, contactIds))
      : Promise.resolve([]),
    companyIds.length
      ? db.select({ id: companies.id, name: companies.name, type: companies.type, tier: companies.tier })
          .from(companies)
          .where(inArray(companies.id, companyIds))
      : Promise.resolve([]),
    dealIds.length
      ? db.select({ id: deals.id, deal_name: deals.deal_name, status: deals.status, stage: deals.stage, actual_value: deals.actual_value })
          .from(deals)
          .where(inArray(deals.id, dealIds))
      : Promise.resolve([]),
    contractIds.length
      ? db.select({ id: contracts.id, contract_title: contracts.contract_title, contract_value: contracts.contract_value, status: contracts.status })
          .from(contracts)
          .where(inArray(contracts.id, contractIds))
      : Promise.resolve([]),
  ]);

  const contactMap  = new Map(contactRows.map(c => [c.id, c]));
  const companyMap  = new Map(companyRows.map(c => [c.id, c]));
  const dealMap     = new Map(dealRows.map(d => [d.id, d]));
  const contractMap = new Map(contractRows.map(c => [c.id, c]));

  const now = new Date();
  const enriched = rows.map(p => {
    // Compute live overdue flag without mutating the DB
    const isOverdue = (
      p.payment_status === 'invoice_sent' || p.payment_status === 'partial'
    ) && p.due_date && new Date(p.due_date) < now;

    return {
      ...p,
      is_overdue: isOverdue ?? false,
      contact:  p.contact_id  ? (contactMap.get(p.contact_id)   ?? null) : null,
      company:  p.company_id  ? (companyMap.get(p.company_id)   ?? null) : null,
      deal:     p.deal_id     ? (dealMap.get(p.deal_id)         ?? null) : null,
      contract: p.contract_id ? (contractMap.get(p.contract_id) ?? null) : null,
    };
  });

  return { payments: enriched, total: enriched.length, fetched_at: new Date().toISOString() };
};

// ─── Get Single Payment ───────────────────────────────────────────────────────

export const getPayment = async (id: string) => {
  const [payment] = await db.select().from(payments)
    .where(eq(payments.id, id)).limit(1);
  if (!payment) throw new AppError('Payment not found', 404);

  const [contact, company, deal, contract] = await Promise.all([
    payment.contact_id
      ? db.select().from(licensing_contacts).where(eq(licensing_contacts.id, payment.contact_id)).limit(1).then(r => r[0] ?? null)
      : Promise.resolve(null),
    payment.company_id
      ? db.select().from(companies).where(eq(companies.id, payment.company_id)).limit(1).then(r => r[0] ?? null)
      : Promise.resolve(null),
    payment.deal_id
      ? db.select().from(deals).where(eq(deals.id, payment.deal_id)).limit(1).then(r => r[0] ?? null)
      : Promise.resolve(null),
    payment.contract_id
      ? db.select().from(contracts).where(eq(contracts.id, payment.contract_id)).limit(1).then(r => r[0] ?? null)
      : Promise.resolve(null),
  ]);

  const now = new Date();
  const isOverdue = (
    payment.payment_status === 'invoice_sent' || payment.payment_status === 'partial'
  ) && payment.due_date && new Date(payment.due_date) < now;

  return { ...payment, is_overdue: isOverdue ?? false, contact, company, deal, contract };
};

// ─── Update Payment Status ────────────────────────────────────────────────────

export const updatePaymentStatus = async (id: string, status: PaymentStatus) => {
  const [payment] = await db.select().from(payments)
    .where(eq(payments.id, id)).limit(1);
  if (!payment) throw new AppError('Payment not found', 404);

  const now   = new Date();
  const patch: Partial<typeof payments.$inferInsert> = {
    payment_status: status,
    updated_at:     now,
  };

  if (status === 'invoice_sent' && !payment.invoice_sent_at) patch.invoice_sent_at = now;
  if (status === 'paid'         && !payment.paid_at)         patch.paid_at         = now;

  const [updated] = await db.update(payments).set(patch)
    .where(eq(payments.id, id)).returning();

  if (status === 'paid') {
    const amount = parseFloat(String(payment.payment_amount ?? '0'));
    if (payment.deal_id) {
      await db.update(deals).set({
        actual_value: String(amount),
        updated_at:   now,
      }).where(eq(deals.id, payment.deal_id));
    }
    if (payment.contact_id) await updateContactMemoryPayments(payment.contact_id, 'paid', amount);
    if (payment.company_id) await updateCompanyMemoryPayments(payment.company_id, 'paid', amount);
    await updateAdaptivePaymentSignal('revenue_per_company');
    await updateAdaptivePaymentSignal('revenue_per_contact');
  }

  await updateAdaptivePaymentSignal('average_collection_time');

  logActivity({
    eventType:  'payment_status_updated',
    module:     'payments',
    entityType: 'payment',
    entityId:   id,
    title:      `Payment status → "${status}": ${payment.invoice_number}`,
    severity:   status === 'cancelled' ? 'warning' : 'info',
    metadata:   { previous_status: payment.payment_status, new_status: status },
  });

  return updated;
};

// ─── Analytics ────────────────────────────────────────────────────────────────

export const getPaymentAnalytics = async () => {
  const allPayments = await db.select({
    payment_status:  payments.payment_status,
    payment_amount:  payments.payment_amount,
    currency:        payments.currency,
    invoice_sent_at: payments.invoice_sent_at,
    due_date:        payments.due_date,
    paid_at:         payments.paid_at,
    contact_id:      payments.contact_id,
    company_id:      payments.company_id,
    created_at:      payments.created_at,
  }).from(payments);

  const now           = new Date();
  const total         = allPayments.length;
  const paidList      = allPayments.filter(p => p.payment_status === 'paid');
  const overdueList   = allPayments.filter(p =>
    (p.payment_status === 'invoice_sent' || p.payment_status === 'partial') &&
    p.due_date && new Date(p.due_date) < now,
  );

  const payments_created  = total;
  const payments_paid     = paidList.length;
  const payments_overdue  = overdueList.length;
  const collection_rate   = total > 0 ? parseFloat((payments_paid / total).toFixed(4)) : 0;

  const paidAmounts       = paidList.map(p => parseFloat(String(p.payment_amount ?? '0')));
  const total_paid_value  = paidAmounts.reduce((a, b) => a + b, 0);
  const average_payment_value = payments_paid > 0
    ? parseFloat((total_paid_value / payments_paid).toFixed(2))
    : 0;

  // Monthly revenue (current calendar month)
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthly_revenue = paidList
    .filter(p => p.paid_at && new Date(p.paid_at) >= startOfMonth)
    .reduce((sum, p) => sum + parseFloat(String(p.payment_amount ?? '0')), 0);

  // Average collection time (invoice_sent_at → paid_at)
  const collectedWithTimes = allPayments.filter(p =>
    p.payment_status === 'paid' && p.invoice_sent_at && p.paid_at,
  );
  let average_collection_time = 0;
  if (collectedWithTimes.length > 0) {
    const totalDays = collectedWithTimes.reduce((sum, p) => {
      const diffMs = new Date(p.paid_at!).getTime() - new Date(p.invoice_sent_at!).getTime();
      return sum + diffMs / (1000 * 60 * 60 * 24);
    }, 0);
    average_collection_time = parseFloat((totalDays / collectedWithTimes.length).toFixed(2));
  }

  // Revenue per company
  const companyRevMap = new Map<string, number>();
  for (const p of paidList) {
    if (!p.company_id) continue;
    companyRevMap.set(p.company_id, (companyRevMap.get(p.company_id) ?? 0) + parseFloat(String(p.payment_amount ?? '0')));
  }
  const revenue_per_company = companyRevMap.size > 0
    ? parseFloat((total_paid_value / companyRevMap.size).toFixed(2))
    : 0;

  // Revenue per contact
  const contactRevMap = new Map<string, number>();
  for (const p of paidList) {
    if (!p.contact_id) continue;
    contactRevMap.set(p.contact_id, (contactRevMap.get(p.contact_id) ?? 0) + parseFloat(String(p.payment_amount ?? '0')));
  }
  const revenue_per_contact = contactRevMap.size > 0
    ? parseFloat((total_paid_value / contactRevMap.size).toFixed(2))
    : 0;

  // Status breakdown
  const statusBreakdown: Record<string, number> = {};
  for (const p of allPayments) {
    statusBreakdown[p.payment_status] = (statusBreakdown[p.payment_status] ?? 0) + 1;
  }

  const adaptiveRows = await db.select().from(adaptive_weight)
    .where(sql`${adaptive_weight.factor_name} IN ('average_collection_time','revenue_per_company','revenue_per_contact')`);
  const adaptiveMap = new Map(adaptiveRows.map(r => [r.factor_name, r]));

  return {
    payments_created,
    payments_paid,
    payments_overdue,
    collection_rate,
    average_payment_value,
    monthly_revenue: parseFloat(monthly_revenue.toFixed(2)),
    total_paid_value: parseFloat(total_paid_value.toFixed(2)),
    status_breakdown: statusBreakdown,
    adaptive_signals: {
      average_collection_time: {
        value:  average_collection_time,
        signal: adaptiveMap.get('average_collection_time') ?? null,
      },
      revenue_per_company: {
        value:  revenue_per_company,
        signal: adaptiveMap.get('revenue_per_company') ?? null,
      },
      revenue_per_contact: {
        value:  revenue_per_contact,
        signal: adaptiveMap.get('revenue_per_contact') ?? null,
      },
    },
    computed_at: new Date().toISOString(),
  };
};

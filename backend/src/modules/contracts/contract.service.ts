import { eq, desc, sql, and, isNotNull } from 'drizzle-orm';
import { db } from '../../db';
import {
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
import { autoCreatePaymentFromContract } from '../payments/payment.service';
import type { CreateContractInput } from './contract.schema';

const ENGINE_VERSION = 'contract-intelligence-v1';

type ContractStatus = 'draft' | 'generated' | 'sent' | 'viewed' | 'signed' | 'expired' | 'cancelled';

// ─── Intelligence Generator ───────────────────────────────────────────────────

interface ContractIntelligence {
  contract_summary:    string;
  contract_value:      number;
  deal_context:        Record<string, unknown>;
  recommended_terms:   string[];
  metadata:            Record<string, unknown>;
}

async function generateContractIntelligence(
  dealId:    string | null,
  companyId: string | null,
  contactId: string | null,
): Promise<ContractIntelligence> {
  let dealContext:         Record<string, unknown> = {};
  let contractValue        = 0;
  let companyContext:      Record<string, unknown> = {};
  let contactContext:      Record<string, unknown> = {};
  let replyContext:        Record<string, unknown> = {};
  let meetingContext:      Record<string, unknown> = {};
  const recommendedTerms: string[] = [];

  if (dealId) {
    const [deal] = await db.select().from(deals).where(eq(deals.id, dealId)).limit(1);
    if (deal) {
      contractValue = parseFloat(String(deal.actual_value ?? deal.projected_value ?? '0'));
      dealContext = {
        deal_id:         deal.id,
        deal_name:       deal.deal_name,
        deal_type:       deal.deal_type,
        stage:           deal.stage,
        status:          deal.status,
        projected_value: deal.projected_value,
        actual_value:    deal.actual_value,
        win_probability: deal.win_probability,
        deal_score:      deal.deal_score,
        notes:           deal.notes,
      };

      // Load meeting context via deal
      if (deal.meeting_id) {
        const [meeting] = await db.select().from(meetings)
          .where(eq(meetings.id, deal.meeting_id)).limit(1);
        if (meeting) {
          meetingContext = {
            meeting_id:       meeting.id,
            meeting_title:    meeting.meeting_title,
            meeting_type:     meeting.meeting_type,
            status:           meeting.status,
            scheduled_at:     meeting.scheduled_at,
            notes:            meeting.notes,
            brief_summary:    (meeting.meeting_brief as Record<string, unknown>)?.summary ?? null,
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
        company_id:   company.id,
        name:         company.name,
        type:         company.type,
        tier:         company.tier,
        country:      company.country,
        website:      company.website,
      };
      if (company.tier === 'tier_a') {
        recommendedTerms.push('Net 30 payment terms', 'Exclusivity clause for primary market');
      } else if (company.tier === 'tier_b') {
        recommendedTerms.push('Net 45 payment terms', 'Non-exclusive worldwide license');
      } else {
        recommendedTerms.push('Net 60 payment terms', 'Territory-restricted license');
      }
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

    // Load latest positive reply for context
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
        reasoning:  latestReply.reasoning,
      };
    }
  }

  // Build recommended terms from deal type
  const dealType = (dealContext.deal_type as string | null) ?? null;
  if (dealType === 'sync' || dealType === 'licensing') {
    recommendedTerms.push(
      'Sync license for TV/Film use',
      'One-year initial license term with renewal option',
      'Full master and sync rights included',
    );
  } else if (dealType === 'partnership') {
    recommendedTerms.push(
      'Revenue share agreement (50/50)',
      'Joint marketing obligations',
      'Quarterly reporting requirements',
    );
  } else {
    recommendedTerms.push(
      'Standard licensing terms apply',
      'Written termination notice required (30 days)',
      'Governing law: jurisdiction of signing party',
    );
  }

  const contractSummary = buildContractSummary(dealContext, companyContext, contactContext, contractValue);

  return {
    contract_summary:  contractSummary,
    contract_value:    contractValue,
    deal_context:      dealContext,
    recommended_terms: recommendedTerms,
    metadata: {
      company_context:  companyContext,
      contact_context:  contactContext,
      reply_context:    replyContext,
      meeting_context:  meetingContext,
      engine_version:   ENGINE_VERSION,
      generated_at:     new Date().toISOString(),
    },
  };
}

function buildContractSummary(
  deal:     Record<string, unknown>,
  company:  Record<string, unknown>,
  contact:  Record<string, unknown>,
  value:    number,
): string {
  const parts: string[] = [];
  const dealName    = (deal.deal_name as string)   || 'Unnamed Deal';
  const companyName = (company.name as string)     || 'Unknown Company';
  const contactName = (contact.full_name as string) || 'Unknown Contact';
  const formattedValue = value > 0
    ? `$${value.toLocaleString('en-US', { minimumFractionDigits: 2 })}`
    : 'TBD';

  parts.push(`Contract for ${dealName} between DATIAM and ${companyName}.`);
  parts.push(`Primary contact: ${contactName}.`);
  parts.push(`Estimated contract value: ${formattedValue}.`);
  if (deal.deal_type) parts.push(`Deal type: ${deal.deal_type}.`);
  if (deal.stage)     parts.push(`Current deal stage: ${deal.stage}.`);

  return parts.join(' ');
}

// ─── Memory Updates ───────────────────────────────────────────────────────────

async function updateContactMemoryContracts(
  contactId: string,
  event: 'created' | 'sent' | 'signed',
): Promise<void> {
  const [existing] = await db.select().from(contact_memory)
    .where(eq(contact_memory.contact_id, contactId)).limit(1);
  if (!existing) return;

  await db.update(contact_memory).set({
    contracts_created: sql`${contact_memory.contracts_created} + ${event === 'created' ? 1 : 0}`,
    contracts_sent:    sql`${contact_memory.contracts_sent}    + ${event === 'sent'    ? 1 : 0}`,
    contracts_signed:  sql`${contact_memory.contracts_signed}  + ${event === 'signed'  ? 1 : 0}`,
    memory_updated_at: new Date(),
  }).where(eq(contact_memory.contact_id, contactId));
}

async function updateCompanyMemoryContracts(
  companyId: string,
  event: 'created' | 'sent' | 'signed',
): Promise<void> {
  const [existing] = await db.select().from(company_memory)
    .where(eq(company_memory.company_id, companyId)).limit(1);
  if (!existing) return;

  await db.update(company_memory).set({
    contracts_created: sql`${company_memory.contracts_created} + ${event === 'created' ? 1 : 0}`,
    contracts_sent:    sql`${company_memory.contracts_sent}    + ${event === 'sent'    ? 1 : 0}`,
    contracts_signed:  sql`${company_memory.contracts_signed}  + ${event === 'signed'  ? 1 : 0}`,
    memory_updated_at: new Date(),
  }).where(eq(company_memory.company_id, companyId));
}

// ─── Adaptive Signals ─────────────────────────────────────────────────────────

async function updateAdaptiveContractSignal(
  factor: 'contract_conversion_rate' | 'average_time_to_signature',
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

// ─── Auto-create from Won Deal ────────────────────────────────────────────────

export const autoCreateContractFromDeal = async (
  dealId: string,
): Promise<typeof contracts.$inferSelect | null> => {
  try {
    const [deal] = await db.select().from(deals).where(eq(deals.id, dealId)).limit(1);
    if (!deal) return null;

    // Avoid duplicate contracts for the same deal
    const [existing] = await db.select({ id: contracts.id }).from(contracts)
      .where(and(eq(contracts.deal_id, dealId), sql`${contracts.status} != 'cancelled'`))
      .limit(1);
    if (existing) return null;

    const intel = await generateContractIntelligence(
      dealId,
      deal.company_id ?? null,
      deal.contact_id ?? null,
    );

    const contractTitle = `Contract — ${deal.deal_name}`;

    const [newContract] = await db.insert(contracts).values({
      deal_id:            dealId,
      company_id:         deal.company_id ?? null,
      contact_id:         deal.contact_id ?? null,
      contract_title:     contractTitle,
      contract_type:      deal.deal_type ?? null,
      contract_value:     intel.contract_value > 0 ? String(intel.contract_value) : null,
      currency:           'USD',
      status:             'generated',
      generated_at:       new Date(),
      metadata:           {
        ...intel.metadata,
        contract_summary:  intel.contract_summary,
        recommended_terms: intel.recommended_terms,
        deal_context:      intel.deal_context,
        auto_generated:    true,
      } as unknown as Record<string, unknown>,
    }).returning();

    if (deal.contact_id) await updateContactMemoryContracts(deal.contact_id, 'created');
    if (deal.company_id) await updateCompanyMemoryContracts(deal.company_id, 'created');
    await updateAdaptiveContractSignal('contract_conversion_rate');

    logActivity({
      eventType:  'contract_auto_created',
      module:     'contracts',
      entityType: 'contract',
      entityId:   newContract.id,
      title:      `Contract auto-created from deal: ${contractTitle}`,
      severity:   'info',
      metadata: {
        deal_id:        dealId,
        company_id:     deal.company_id,
        contact_id:     deal.contact_id,
        contract_value: intel.contract_value,
      },
    });

    return newContract;
  } catch (err) {
    console.error('[ContractService] autoCreateContractFromDeal failed:', err);
    return null;
  }
};

// ─── Create Contract (manual) ─────────────────────────────────────────────────

export const createContract = async (input: CreateContractInput) => {
  const dealId    = input.deal_id    ?? null;
  const companyId = input.company_id ?? null;
  const contactId = input.contact_id ?? null;

  const intel = await generateContractIntelligence(dealId, companyId, contactId);

  const contractValue = input.contract_value ?? intel.contract_value;

  const [newContract] = await db.insert(contracts).values({
    deal_id:            dealId,
    company_id:         companyId,
    contact_id:         contactId,
    contract_title:     input.contract_title,
    contract_type:      input.contract_type ?? null,
    contract_value:     contractValue > 0 ? String(contractValue) : null,
    currency:           input.currency ?? 'USD',
    status:             'generated',
    generated_at:       new Date(),
    expires_at:         input.expires_at ? new Date(input.expires_at) : null,
    file_url:           input.file_url ?? null,
    signature_provider: input.signature_provider ?? null,
    metadata:           {
      ...intel.metadata,
      contract_summary:  intel.contract_summary,
      recommended_terms: intel.recommended_terms,
      deal_context:      intel.deal_context,
    } as unknown as Record<string, unknown>,
  }).returning();

  if (contactId) await updateContactMemoryContracts(contactId, 'created');
  if (companyId) await updateCompanyMemoryContracts(companyId, 'created');
  await updateAdaptiveContractSignal('contract_conversion_rate');

  logActivity({
    eventType:  'contract_created',
    module:     'contracts',
    entityType: 'contract',
    entityId:   newContract.id,
    title:      `Contract created: ${newContract.contract_title}`,
    severity:   'info',
    metadata: {
      deal_id:        dealId,
      company_id:     companyId,
      contact_id:     contactId,
      contract_value: contractValue,
    },
  });

  return newContract;
};

// ─── Send Contract ────────────────────────────────────────────────────────────

export const sendContract = async (contractId: string) => {
  const [contract] = await db.select().from(contracts)
    .where(eq(contracts.id, contractId)).limit(1);
  if (!contract) throw new AppError('Contract not found', 404);

  if (contract.status === 'signed' || contract.status === 'cancelled') {
    throw new AppError(`Cannot send a contract in "${contract.status}" status`, 400);
  }

  const [updated] = await db.update(contracts).set({
    status:     'sent',
    sent_at:    new Date(),
    updated_at: new Date(),
  }).where(eq(contracts.id, contractId)).returning();

  if (contract.contact_id) await updateContactMemoryContracts(contract.contact_id, 'sent');
  if (contract.company_id) await updateCompanyMemoryContracts(contract.company_id, 'sent');
  await updateAdaptiveContractSignal('contract_conversion_rate');

  logActivity({
    eventType:  'contract_sent',
    module:     'contracts',
    entityType: 'contract',
    entityId:   contractId,
    title:      `Contract sent: ${contract.contract_title}`,
    severity:   'info',
    metadata:   { deal_id: contract.deal_id, company_id: contract.company_id },
  });

  return updated;
};

// ─── List Contracts ───────────────────────────────────────────────────────────

export const listContracts = async (limit = 100) => {
  const rows = await db.select().from(contracts)
    .orderBy(desc(contracts.created_at)).limit(limit);

  if (!rows.length) {
    return { contracts: [], total: 0, fetched_at: new Date().toISOString() };
  }

  const contactIds = [...new Set(rows.map(r => r.contact_id).filter((id): id is string => id !== null))];
  const companyIds = [...new Set(rows.map(r => r.company_id).filter((id): id is string => id !== null))];
  const dealIds    = [...new Set(rows.map(r => r.deal_id).filter((id): id is string => id !== null))];

  const [contactRows, companyRows, dealRows] = await Promise.all([
    contactIds.length
      ? db.select({ id: licensing_contacts.id, full_name: licensing_contacts.full_name, email: licensing_contacts.email, role: licensing_contacts.role })
          .from(licensing_contacts)
      : Promise.resolve([]),
    companyIds.length
      ? db.select({ id: companies.id, name: companies.name, type: companies.type, tier: companies.tier })
          .from(companies)
      : Promise.resolve([]),
    dealIds.length
      ? db.select({ id: deals.id, deal_name: deals.deal_name, status: deals.status, stage: deals.stage, actual_value: deals.actual_value })
          .from(deals)
      : Promise.resolve([]),
  ]);

  const contactMap = new Map(contactRows.map(c => [c.id, c]));
  const companyMap = new Map(companyRows.map(c => [c.id, c]));
  const dealMap    = new Map(dealRows.map(d => [d.id, d]));

  const enriched = rows.map(c => ({
    ...c,
    contact: c.contact_id ? (contactMap.get(c.contact_id) ?? null) : null,
    company: c.company_id ? (companyMap.get(c.company_id) ?? null) : null,
    deal:    c.deal_id    ? (dealMap.get(c.deal_id)    ?? null) : null,
  }));

  return { contracts: enriched, total: enriched.length, fetched_at: new Date().toISOString() };
};

// ─── Get Single Contract ──────────────────────────────────────────────────────

export const getContract = async (id: string) => {
  const [contract] = await db.select().from(contracts)
    .where(eq(contracts.id, id)).limit(1);
  if (!contract) throw new AppError('Contract not found', 404);

  const [contact, company, deal] = await Promise.all([
    contract.contact_id
      ? db.select().from(licensing_contacts).where(eq(licensing_contacts.id, contract.contact_id)).limit(1).then(r => r[0] ?? null)
      : Promise.resolve(null),
    contract.company_id
      ? db.select().from(companies).where(eq(companies.id, contract.company_id)).limit(1).then(r => r[0] ?? null)
      : Promise.resolve(null),
    contract.deal_id
      ? db.select().from(deals).where(eq(deals.id, contract.deal_id)).limit(1).then(r => r[0] ?? null)
      : Promise.resolve(null),
  ]);

  return { ...contract, contact, company, deal };
};

// ─── Update Contract Status ───────────────────────────────────────────────────

export const updateContractStatus = async (id: string, status: ContractStatus) => {
  const [contract] = await db.select().from(contracts)
    .where(eq(contracts.id, id)).limit(1);
  if (!contract) throw new AppError('Contract not found', 404);

  const now = new Date();
  const patch: Partial<typeof contracts.$inferInsert> = {
    status,
    updated_at: now,
  };

  if (status === 'sent'    && !contract.sent_at)    patch.sent_at    = now;
  if (status === 'viewed'  && !contract.viewed_at)  patch.viewed_at  = now;
  if (status === 'signed'  && !contract.signed_at)  patch.signed_at  = now;

  const [updated] = await db.update(contracts).set(patch)
    .where(eq(contracts.id, id)).returning();

  // When signed: update deal, memories, adaptive signals, auto-create payment
  if (status === 'signed') {
    if (contract.deal_id) {
      await db.update(deals).set({
        stage:      'contract_signed',
        status:     'won',
        closed_at:  now,
        updated_at: now,
      }).where(eq(deals.id, contract.deal_id));

      logActivity({
        eventType:  'deal_won_via_contract',
        module:     'contracts',
        entityType: 'deal',
        entityId:   contract.deal_id,
        title:      `Deal won via contract signature: ${contract.contract_title}`,
        severity:   'info',
        metadata:   { contract_id: id, contract_value: contract.contract_value },
      });
    }

    if (contract.contact_id) await updateContactMemoryContracts(contract.contact_id, 'signed');
    if (contract.company_id) await updateCompanyMemoryContracts(contract.company_id, 'signed');
    await updateAdaptiveContractSignal('contract_conversion_rate');
    await updateAdaptiveContractSignal('average_time_to_signature');

    // Auto-create payment record from the signed contract
    autoCreatePaymentFromContract(id).catch((err) =>
      console.error('[ContractService] auto-payment creation failed:', err),
    );
  }

  if (status === 'sent') {
    if (contract.contact_id) await updateContactMemoryContracts(contract.contact_id, 'sent');
    if (contract.company_id) await updateCompanyMemoryContracts(contract.company_id, 'sent');
    await updateAdaptiveContractSignal('contract_conversion_rate');
  }

  logActivity({
    eventType:  'contract_status_updated',
    module:     'contracts',
    entityType: 'contract',
    entityId:   id,
    title:      `Contract status → "${status}": ${contract.contract_title}`,
    severity:   status === 'cancelled' ? 'warning' : 'info',
    metadata:   { previous_status: contract.status, new_status: status },
  });

  return updated;
};

// ─── Analytics ────────────────────────────────────────────────────────────────

export const getContractAnalytics = async () => {
  const allContracts = await db.select({
    status:         contracts.status,
    contract_value: contracts.contract_value,
    generated_at:   contracts.generated_at,
    sent_at:        contracts.sent_at,
    signed_at:      contracts.signed_at,
  }).from(contracts);

  const total             = allContracts.length;
  const contracts_created = total;
  const contracts_sent    = allContracts.filter(c => ['sent','viewed','signed'].includes(c.status)).length;
  const contracts_signed  = allContracts.filter(c => c.status === 'signed').length;
  const contracts_expired = allContracts.filter(c => c.status === 'expired').length;
  const contracts_cancelled = allContracts.filter(c => c.status === 'cancelled').length;

  const signature_rate = contracts_sent > 0
    ? parseFloat((contracts_signed / contracts_sent).toFixed(4))
    : 0;

  const signedValues = allContracts
    .filter(c => c.status === 'signed')
    .map(c => parseFloat(String(c.contract_value ?? '0')));
  const average_contract_value = signedValues.length > 0
    ? parseFloat((signedValues.reduce((a, b) => a + b, 0) / signedValues.length).toFixed(2))
    : 0;

  // Average time to signature (days from generated_at to signed_at)
  const signedWithTimes = allContracts.filter(c =>
    c.status === 'signed' && c.generated_at && c.signed_at,
  );
  let average_time_to_signature = 0;
  if (signedWithTimes.length > 0) {
    const totalDays = signedWithTimes.reduce((sum, c) => {
      const diffMs = new Date(c.signed_at!).getTime() - new Date(c.generated_at!).getTime();
      return sum + diffMs / (1000 * 60 * 60 * 24);
    }, 0);
    average_time_to_signature = parseFloat((totalDays / signedWithTimes.length).toFixed(2));
  }

  const contract_conversion_rate = total > 0
    ? parseFloat((contracts_signed / total).toFixed(4))
    : 0;

  const statusBreakdown: Record<string, number> = {};
  for (const c of allContracts) {
    statusBreakdown[c.status] = (statusBreakdown[c.status] ?? 0) + 1;
  }

  const adaptiveRows = await db.select().from(adaptive_weight)
    .where(sql`${adaptive_weight.factor_name} IN ('contract_conversion_rate','average_time_to_signature')`);
  const adaptiveMap = new Map(adaptiveRows.map(r => [r.factor_name, r]));

  return {
    contracts_created,
    contracts_sent,
    contracts_signed,
    contracts_expired,
    contracts_cancelled,
    signature_rate,
    average_contract_value,
    contract_conversion_rate,
    average_time_to_signature,
    status_breakdown: statusBreakdown,
    adaptive_signals: {
      contract_conversion_rate:  adaptiveMap.get('contract_conversion_rate')  ?? null,
      average_time_to_signature: adaptiveMap.get('average_time_to_signature') ?? null,
    },
    computed_at: new Date().toISOString(),
  };
};

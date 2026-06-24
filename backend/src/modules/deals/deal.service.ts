import { eq, desc, sql, and } from 'drizzle-orm';
import { db } from '../../db';
import {
  deals,
  meetings,
  outreach_campaign,
  licensing_contacts,
  companies,
  contact_memory,
  company_memory,
  adaptive_weight,
  reply_log,
  artist_sync_memory,
} from '../../db/schema';
import { AppError } from '../../middleware/errorHandler';
import { logActivity } from '../../lib/activityLogger';
import { autoCreateContractFromDeal } from '../contracts/contract.service';
import type {
  CreateDealInput,
  UpdateDealInput,
} from './deal.schema';

const ENGINE_VERSION = 'deal-intelligence-v1';

type DealStatus = 'open' | 'won' | 'lost' | 'cancelled';
type DealStage  =
  | 'lead' | 'contacted' | 'replied'
  | 'meeting_scheduled' | 'meeting_completed'
  | 'proposal_sent' | 'negotiation'
  | 'contract_sent' | 'contract_signed'
  | 'won' | 'lost';

// ─── Intelligence Engine ──────────────────────────────────────────────────────

interface IntelligenceInputs {
  opportunityScore:    number;
  replyConfidence:     number;
  meetingPrepScore:    number;
  relationshipStrength: number;
  artistSuccessRate:   number;
  companyTier:         string | null;
  stage:               DealStage;
  projectedValue:      number;
}

function computeDealScore(inputs: IntelligenceInputs): number {
  const raw =
    (inputs.opportunityScore    * 0.30) +
    (inputs.replyConfidence     * 0.20) +
    (inputs.meetingPrepScore    * 0.25) +
    (inputs.relationshipStrength * 0.15) +
    (inputs.artistSuccessRate   * 0.10);
  return parseFloat(Math.min(1, Math.max(0, raw)).toFixed(2));
}

function computeWinProbability(inputs: IntelligenceInputs, dealScore: number): number {
  let prob = dealScore * 60;

  const stageBonus: Partial<Record<DealStage, number>> = {
    proposal_sent:    10,
    negotiation:      15,
    contract_sent:    20,
    contract_signed:  30,
    won:              40,
  };
  prob += stageBonus[inputs.stage] ?? 0;

  if (inputs.companyTier === 'tier_a') prob += 10;
  else if (inputs.companyTier === 'tier_b') prob += 5;

  return parseFloat(Math.min(95, Math.max(5, prob)).toFixed(2));
}

function determineNextAction(stage: DealStage, winProbability: number): string {
  if (stage === 'meeting_completed') return 'send_proposal';
  if (stage === 'proposal_sent')     return winProbability > 60 ? 'negotiate' : 'follow_up';
  if (stage === 'negotiation')       return 'send_contract';
  if (stage === 'contract_sent')     return 'follow_up';
  if (stage === 'contract_signed')   return 'close_deal';
  if (stage === 'won')               return 'close_deal';
  if (stage === 'lost')              return 'reopen_opportunity';
  return 'send_proposal';
}

function computeRevenueForecast(projectedValue: number, winProbability: number): number {
  return parseFloat((projectedValue * (winProbability / 100)).toFixed(2));
}

async function buildIntelligence(
  meetingId:  string | null,
  campaignId: string | null,
  contactId:  string | null,
  companyId:  string | null,
  stage:      DealStage,
  projectedValue: number,
): Promise<{
  dealScore:             number;
  winProbability:        number;
  recommendedNextAction: string;
  revenueForecast:       number;
  context:               Record<string, unknown>;
}> {
  let opportunityScore    = 0;
  let replyConfidence     = 0;
  let meetingPrepScore    = 0;
  let relationshipStrength = 0;
  let artistSuccessRate   = 0;
  let companyTier: string | null = null;

  // Load meeting data
  if (meetingId) {
    const [m] = await db.select().from(meetings).where(eq(meetings.id, meetingId)).limit(1);
    if (m) {
      meetingPrepScore = parseFloat(String(m.meeting_preparation_score ?? '0'));
    }
  }

  // Load campaign → opportunity score
  if (campaignId) {
    const [c] = await db.select({ opportunity_score: outreach_campaign.opportunity_score })
      .from(outreach_campaign).where(eq(outreach_campaign.id, campaignId)).limit(1);
    if (c) opportunityScore = parseFloat(String(c.opportunity_score ?? '0'));
  }

  // Load contact memory → relationship strength + latest reply confidence
  if (contactId) {
    const [mem] = await db.select().from(contact_memory)
      .where(eq(contact_memory.contact_id, contactId)).limit(1);
    if (mem) relationshipStrength = parseFloat(String(mem.relationship_strength ?? '0'));

    const [latestReply] = await db.select({ confidence: reply_log.confidence })
      .from(reply_log)
      .where(eq(reply_log.contact_id, contactId))
      .orderBy(desc(reply_log.created_at))
      .limit(1);
    if (latestReply) replyConfidence = parseFloat(String(latestReply.confidence ?? '0'));
  }

  // Load company → tier
  if (companyId) {
    const [co] = await db.select({ tier: companies.tier })
      .from(companies).where(eq(companies.id, companyId)).limit(1);
    if (co) companyTier = co.tier;
  }

  // Load artist success history (first available artist_sync_memory)
  const [artistMem] = await db.select({ success_rate: artist_sync_memory.success_rate })
    .from(artist_sync_memory).limit(1);
  if (artistMem) artistSuccessRate = parseFloat(String(artistMem.success_rate ?? '0'));

  const inputs: IntelligenceInputs = {
    opportunityScore,
    replyConfidence,
    meetingPrepScore,
    relationshipStrength,
    artistSuccessRate,
    companyTier,
    stage,
    projectedValue,
  };

  const dealScore             = computeDealScore(inputs);
  const winProbability        = computeWinProbability(inputs, dealScore);
  const recommendedNextAction = determineNextAction(stage, winProbability);
  const revenueForecast       = computeRevenueForecast(projectedValue, winProbability);

  const context = {
    inputs: {
      opportunity_score:    opportunityScore,
      reply_confidence:     replyConfidence,
      meeting_prep_score:   meetingPrepScore,
      relationship_strength: relationshipStrength,
      artist_success_rate:  artistSuccessRate,
      company_tier:         companyTier,
    },
    score_weights: {
      opportunity_score:    0.30,
      reply_confidence:     0.20,
      meeting_prep_score:   0.25,
      relationship_strength: 0.15,
      artist_success_rate:  0.10,
    },
    deal_score:              dealScore,
    win_probability:         winProbability,
    recommended_next_action: recommendedNextAction,
    revenue_forecast:        revenueForecast,
    engine_version:          ENGINE_VERSION,
  };

  return { dealScore, winProbability, recommendedNextAction, revenueForecast, context };
}

// ─── Contact Memory ───────────────────────────────────────────────────────────

async function updateContactMemoryDeals(
  contactId: string,
  event: 'created' | 'won' | 'lost',
  revenueAmount = 0,
): Promise<void> {
  const [existing] = await db.select().from(contact_memory)
    .where(eq(contact_memory.contact_id, contactId)).limit(1);
  if (!existing) return;

  await db.update(contact_memory).set({
    deals_created:     sql`${contact_memory.deals_created} + ${event === 'created' ? 1 : 0}`,
    deals_won:         sql`${contact_memory.deals_won}     + ${event === 'won'     ? 1 : 0}`,
    deals_lost:        sql`${contact_memory.deals_lost}    + ${event === 'lost'    ? 1 : 0}`,
    revenue_generated: sql`${contact_memory.revenue_generated} + ${revenueAmount}`,
    memory_updated_at: new Date(),
  }).where(eq(contact_memory.contact_id, contactId));
}

// ─── Company Memory ───────────────────────────────────────────────────────────

async function updateCompanyMemoryDeals(
  companyId: string,
  event: 'created' | 'won' | 'lost',
  revenueAmount = 0,
): Promise<void> {
  const [existing] = await db.select().from(company_memory)
    .where(eq(company_memory.company_id, companyId)).limit(1);
  if (!existing) return;

  await db.update(company_memory).set({
    deals_created:     sql`${company_memory.deals_created} + ${event === 'created' ? 1 : 0}`,
    deals_won:         sql`${company_memory.deals_won}     + ${event === 'won'     ? 1 : 0}`,
    deals_lost:        sql`${company_memory.deals_lost}    + ${event === 'lost'    ? 1 : 0}`,
    revenue_generated: sql`${company_memory.revenue_generated} + ${revenueAmount}`,
    memory_updated_at: new Date(),
  }).where(eq(company_memory.company_id, companyId));
}

// ─── Adaptive Signals ────────────────────────────────────────────────────────

async function updateAdaptiveDealSignals(
  factor: 'deal_win_rate' | 'average_deal_value' | 'revenue_per_contact' | 'revenue_per_company',
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

// ─── Auto-create from Meeting ─────────────────────────────────────────────────

export const autoCreateDealFromMeeting = async (
  meetingId: string,
): Promise<typeof deals.$inferSelect | null> => {
  try {
    const [meeting] = await db.select().from(meetings)
      .where(eq(meetings.id, meetingId)).limit(1);
    if (!meeting) return null;

    // Avoid duplicate deals for the same meeting
    const [existing] = await db.select({ id: deals.id }).from(deals)
      .where(eq(deals.meeting_id, meetingId)).limit(1);
    if (existing) return null;

    const campaignId = meeting.campaign_id;
    const contactId  = meeting.contact_id ?? null;

    let companyId: string | null = null;
    if (contactId) {
      const [c] = await db.select({ company_id: licensing_contacts.company_id })
        .from(licensing_contacts).where(eq(licensing_contacts.id, contactId)).limit(1);
      companyId = c?.company_id ?? null;
    }

    const stage: DealStage = 'meeting_completed';
    const projectedValue   = 0; // Will be set by user; forecast remains 0 until set

    const intel = await buildIntelligence(
      meetingId,
      campaignId,
      contactId,
      companyId,
      stage,
      projectedValue,
    );

    let contactName = 'Unknown Contact';
    if (contactId) {
      const [c] = await db.select({ full_name: licensing_contacts.full_name })
        .from(licensing_contacts).where(eq(licensing_contacts.id, contactId)).limit(1);
      contactName = c?.full_name ?? contactName;
    }

    const dealName = `Deal — ${contactName} (${new Date().toISOString().split('T')[0]})`;

    const [newDeal] = await db.insert(deals).values({
      meeting_id:              meetingId,
      campaign_id:             campaignId,
      contact_id:              contactId,
      company_id:              companyId,
      deal_name:               dealName,
      deal_type:               meeting.meeting_type,
      status:                  'open',
      stage,
      deal_score:              String(intel.dealScore),
      win_probability:         String(intel.winProbability),
      recommended_next_action: intel.recommendedNextAction,
      revenue_forecast:        String(intel.revenueForecast),
      intelligence_context:    intel.context as unknown as Record<string, unknown>,
      engine_version:          ENGINE_VERSION,
    }).returning();

    if (contactId) await updateContactMemoryDeals(contactId, 'created');
    if (companyId) await updateCompanyMemoryDeals(companyId, 'created');

    await Promise.all([
      updateAdaptiveDealSignals('deal_win_rate'),
      updateAdaptiveDealSignals('average_deal_value'),
    ]);

    logActivity({
      eventType:  'deal_auto_created',
      module:     'deals',
      entityType: 'deal',
      entityId:   newDeal.id,
      title:      `Deal auto-created from completed meeting: ${newDeal.deal_name}`,
      severity:   'info',
      metadata: {
        meeting_id:              meetingId,
        campaign_id:             campaignId,
        contact_id:              contactId,
        company_id:              companyId,
        deal_score:              intel.dealScore,
        win_probability:         intel.winProbability,
        recommended_next_action: intel.recommendedNextAction,
      },
    });

    return newDeal;
  } catch (err) {
    console.error('[DealService] autoCreateDealFromMeeting failed:', err);
    return null;
  }
};

// ─── Create Deal (manual) ─────────────────────────────────────────────────────

export const createDeal = async (input: CreateDealInput) => {
  const stage: DealStage    = 'lead';
  const projectedValue       = input.projected_value ?? 0;

  const intel = await buildIntelligence(
    input.meeting_id  ?? null,
    input.campaign_id ?? null,
    input.contact_id  ?? null,
    input.company_id  ?? null,
    stage,
    projectedValue,
  );

  const [newDeal] = await db.insert(deals).values({
    meeting_id:              input.meeting_id  ?? null,
    campaign_id:             input.campaign_id ?? null,
    contact_id:              input.contact_id  ?? null,
    company_id:              input.company_id  ?? null,
    deal_name:               input.deal_name,
    deal_type:               input.deal_type   ?? null,
    status:                  'open',
    stage,
    projected_value:         projectedValue > 0 ? String(projectedValue) : null,
    expected_close_date:     input.expected_close_date ?? null,
    notes:                   input.notes ?? null,
    deal_score:              String(intel.dealScore),
    win_probability:         String(intel.winProbability),
    recommended_next_action: intel.recommendedNextAction,
    revenue_forecast:        String(intel.revenueForecast),
    intelligence_context:    intel.context as unknown as Record<string, unknown>,
    engine_version:          ENGINE_VERSION,
  }).returning();

  if (input.contact_id) await updateContactMemoryDeals(input.contact_id, 'created');
  if (input.company_id) await updateCompanyMemoryDeals(input.company_id, 'created');

  await updateAdaptiveDealSignals('deal_win_rate');

  logActivity({
    eventType:  'deal_created',
    module:     'deals',
    entityType: 'deal',
    entityId:   newDeal.id,
    title:      `Deal created: ${newDeal.deal_name}`,
    severity:   'info',
    metadata: {
      deal_score:              intel.dealScore,
      win_probability:         intel.winProbability,
      recommended_next_action: intel.recommendedNextAction,
    },
  });

  return newDeal;
};

// ─── List Deals ───────────────────────────────────────────────────────────────

export const listDeals = async (limit = 100) => {
  const rows = await db.select().from(deals).orderBy(desc(deals.created_at)).limit(limit);

  if (!rows.length) {
    return { deals: [], total: 0, fetched_at: new Date().toISOString() };
  }

  const contactIds = [...new Set(rows.map(r => r.contact_id).filter((id): id is string => id !== null))];
  const companyIds = [...new Set(rows.map(r => r.company_id).filter((id): id is string => id !== null))];

  const [contactRows, companyRows] = await Promise.all([
    contactIds.length
      ? db.select({ id: licensing_contacts.id, full_name: licensing_contacts.full_name, email: licensing_contacts.email, role: licensing_contacts.role })
          .from(licensing_contacts)
      : Promise.resolve([]),
    companyIds.length
      ? db.select({ id: companies.id, name: companies.name, type: companies.type, tier: companies.tier })
          .from(companies)
      : Promise.resolve([]),
  ]);

  const contactMap = new Map(contactRows.map(c => [c.id, c]));
  const companyMap = new Map(companyRows.map(c => [c.id, c]));

  const enriched = rows.map(d => ({
    ...d,
    contact: d.contact_id ? (contactMap.get(d.contact_id) ?? null) : null,
    company: d.company_id ? (companyMap.get(d.company_id) ?? null) : null,
  }));

  return { deals: enriched, total: enriched.length, fetched_at: new Date().toISOString() };
};

// ─── Get Single Deal ──────────────────────────────────────────────────────────

export const getDeal = async (id: string) => {
  const [deal] = await db.select().from(deals).where(eq(deals.id, id)).limit(1);
  if (!deal) throw new AppError('Deal not found', 404);

  const [contact, company, campaign, meeting] = await Promise.all([
    deal.contact_id
      ? db.select().from(licensing_contacts).where(eq(licensing_contacts.id, deal.contact_id)).limit(1).then(r => r[0] ?? null)
      : Promise.resolve(null),
    deal.company_id
      ? db.select().from(companies).where(eq(companies.id, deal.company_id)).limit(1).then(r => r[0] ?? null)
      : Promise.resolve(null),
    deal.campaign_id
      ? db.select().from(outreach_campaign).where(eq(outreach_campaign.id, deal.campaign_id)).limit(1).then(r => r[0] ?? null)
      : Promise.resolve(null),
    deal.meeting_id
      ? db.select().from(meetings).where(eq(meetings.id, deal.meeting_id)).limit(1).then(r => r[0] ?? null)
      : Promise.resolve(null),
  ]);

  return { ...deal, contact, company, campaign, meeting };
};

// ─── Update Deal ──────────────────────────────────────────────────────────────

export const updateDeal = async (id: string, input: UpdateDealInput) => {
  const [deal] = await db.select().from(deals).where(eq(deals.id, id)).limit(1);
  if (!deal) throw new AppError('Deal not found', 404);

  const projectedValue = input.projected_value ?? parseFloat(String(deal.projected_value ?? '0'));
  const stage          = deal.stage as DealStage;

  const intel = await buildIntelligence(
    deal.meeting_id  ?? null,
    deal.campaign_id ?? null,
    deal.contact_id  ?? null,
    deal.company_id  ?? null,
    stage,
    projectedValue,
  );

  const [updated] = await db.update(deals).set({
    deal_name:               input.deal_name          ?? deal.deal_name,
    deal_type:               input.deal_type          ?? deal.deal_type,
    projected_value:         input.projected_value    != null ? String(input.projected_value) : deal.projected_value,
    actual_value:            input.actual_value       != null ? String(input.actual_value)    : deal.actual_value,
    expected_close_date:     input.expected_close_date ?? deal.expected_close_date,
    notes:                   input.notes              ?? deal.notes,
    deal_score:              String(intel.dealScore),
    win_probability:         String(intel.winProbability),
    recommended_next_action: intel.recommendedNextAction,
    revenue_forecast:        String(intel.revenueForecast),
    intelligence_context:    intel.context as unknown as Record<string, unknown>,
    updated_at:              new Date(),
  }).where(eq(deals.id, id)).returning();

  logActivity({
    eventType:  'deal_updated',
    module:     'deals',
    entityType: 'deal',
    entityId:   id,
    title:      `Deal updated: ${updated.deal_name}`,
    severity:   'info',
    metadata: { win_probability: intel.winProbability, revenue_forecast: intel.revenueForecast },
  });

  return updated;
};

// ─── Update Stage ─────────────────────────────────────────────────────────────

export const updateDealStage = async (id: string, stage: string) => {
  const validStages: DealStage[] = [
    'lead', 'contacted', 'replied', 'meeting_scheduled', 'meeting_completed',
    'proposal_sent', 'negotiation', 'contract_sent', 'contract_signed', 'won', 'lost',
  ];
  if (!validStages.includes(stage as DealStage)) {
    throw new AppError(`Invalid stage: ${stage}`, 400);
  }

  const [deal] = await db.select().from(deals).where(eq(deals.id, id)).limit(1);
  if (!deal) throw new AppError('Deal not found', 404);

  const projectedValue = parseFloat(String(deal.projected_value ?? '0'));

  const intel = await buildIntelligence(
    deal.meeting_id  ?? null,
    deal.campaign_id ?? null,
    deal.contact_id  ?? null,
    deal.company_id  ?? null,
    stage as DealStage,
    projectedValue,
  );

  const [updated] = await db.update(deals).set({
    stage:                   stage as DealStage,
    deal_score:              String(intel.dealScore),
    win_probability:         String(intel.winProbability),
    recommended_next_action: intel.recommendedNextAction,
    revenue_forecast:        String(intel.revenueForecast),
    intelligence_context:    intel.context as unknown as Record<string, unknown>,
    updated_at:              new Date(),
  }).where(eq(deals.id, id)).returning();

  await updateAdaptiveDealSignals('deal_win_rate');

  logActivity({
    eventType:  'deal_stage_updated',
    module:     'deals',
    entityType: 'deal',
    entityId:   id,
    title:      `Deal stage → "${stage}": ${deal.deal_name}`,
    severity:   'info',
    metadata: {
      previous_stage: deal.stage,
      new_stage:      stage,
      win_probability: intel.winProbability,
    },
  });

  return updated;
};

// ─── Update Status ────────────────────────────────────────────────────────────

export const updateDealStatus = async (id: string, status: string) => {
  const validStatuses: DealStatus[] = ['open', 'won', 'lost', 'cancelled'];
  if (!validStatuses.includes(status as DealStatus)) {
    throw new AppError(`Invalid status: ${status}`, 400);
  }

  const [deal] = await db.select().from(deals).where(eq(deals.id, id)).limit(1);
  if (!deal) throw new AppError('Deal not found', 404);

  const closedAt = (status === 'won' || status === 'lost' || status === 'cancelled')
    ? new Date() : null;

  const [updated] = await db.update(deals).set({
    status:     status as DealStatus,
    closed_at:  closedAt,
    updated_at: new Date(),
  }).where(eq(deals.id, id)).returning();

  // Update contact + company memory and adaptive signals on terminal transitions
  if (status === 'won' || status === 'lost') {
    const actualRevenue = parseFloat(String(deal.actual_value ?? deal.projected_value ?? '0'));
    const revenueAmount = status === 'won' ? actualRevenue : 0;
    const event: 'won' | 'lost' = status as 'won' | 'lost';

    if (deal.contact_id) await updateContactMemoryDeals(deal.contact_id, event, revenueAmount);
    if (deal.company_id) await updateCompanyMemoryDeals(deal.company_id, event, revenueAmount);

    await Promise.all([
      updateAdaptiveDealSignals('deal_win_rate'),
      updateAdaptiveDealSignals('average_deal_value'),
      deal.contact_id ? updateAdaptiveDealSignals('revenue_per_contact') : Promise.resolve(),
      deal.company_id ? updateAdaptiveDealSignals('revenue_per_company') : Promise.resolve(),
    ]);

    // Auto-generate a contract when a deal is won
    if (status === 'won') {
      await autoCreateContractFromDeal(id);
    }
  }

  logActivity({
    eventType:  'deal_status_updated',
    module:     'deals',
    entityType: 'deal',
    entityId:   id,
    title:      `Deal status → "${status}": ${deal.deal_name}`,
    severity:   status === 'lost' ? 'warning' : 'info',
    metadata: { previous_status: deal.status, new_status: status },
  });

  return updated;
};

// ─── Analytics ────────────────────────────────────────────────────────────────

export const getDealAnalytics = async () => {
  const allDeals = await db.select({
    status:          deals.status,
    stage:           deals.stage,
    projected_value: deals.projected_value,
    actual_value:    deals.actual_value,
    win_probability: deals.win_probability,
    revenue_forecast: deals.revenue_forecast,
  }).from(deals);

  const total        = allDeals.length;
  const open_deals   = allDeals.filter(d => d.status === 'open').length;
  const won_deals    = allDeals.filter(d => d.status === 'won').length;
  const lost_deals   = allDeals.filter(d => d.status === 'lost').length;
  const cancelled    = allDeals.filter(d => d.status === 'cancelled').length;

  const terminal   = won_deals + lost_deals;
  const win_rate   = terminal > 0 ? parseFloat((won_deals / terminal).toFixed(4)) : 0;

  const pipeline_value = allDeals
    .filter(d => d.status === 'open')
    .reduce((sum, d) => sum + parseFloat(String(d.projected_value ?? '0')), 0);

  const forecasted_revenue = allDeals
    .filter(d => d.status === 'open')
    .reduce((sum, d) => sum + parseFloat(String(d.revenue_forecast ?? '0')), 0);

  const closed_revenue = allDeals
    .filter(d => d.status === 'won')
    .reduce((sum, d) => sum + parseFloat(String(d.actual_value ?? d.projected_value ?? '0')), 0);

  const avg_deal_value = won_deals > 0
    ? parseFloat((closed_revenue / won_deals).toFixed(2))
    : 0;

  const stageBreakdown: Record<string, number> = {};
  for (const d of allDeals) {
    stageBreakdown[d.stage] = (stageBreakdown[d.stage] ?? 0) + 1;
  }

  const adaptiveRows = await db.select().from(adaptive_weight)
    .where(sql`${adaptive_weight.factor_name} IN ('deal_win_rate','average_deal_value','revenue_per_contact','revenue_per_company')`);
  const adaptiveMap = new Map(adaptiveRows.map(r => [r.factor_name, r]));

  return {
    // canonical fields
    total_deals:       total,
    open_deals,
    won_deals,
    lost_deals,
    cancelled_deals:   cancelled,
    pipeline_value:    parseFloat(pipeline_value.toFixed(2)),
    forecasted_revenue: parseFloat(forecasted_revenue.toFixed(2)),
    closed_revenue:    parseFloat(closed_revenue.toFixed(2)),
    avg_deal_value,
    win_rate,
    stage_breakdown:   stageBreakdown,
    // frontend-aligned aliases
    total,
    cancelled,
    by_stage:          stageBreakdown,
    adaptive_signals: {
      deal_win_rate:       adaptiveMap.get('deal_win_rate')       ?? null,
      average_deal_value:  adaptiveMap.get('average_deal_value')  ?? null,
      revenue_per_contact: adaptiveMap.get('revenue_per_contact') ?? null,
      revenue_per_company: adaptiveMap.get('revenue_per_company') ?? null,
    },
    computed_at: new Date().toISOString(),
  };
};

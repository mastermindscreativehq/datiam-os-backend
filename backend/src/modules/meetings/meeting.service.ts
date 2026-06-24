import { eq, desc, sql, and, ne } from 'drizzle-orm';
import { db } from '../../db';
import {
  meetings,
  outreach_campaign,
  licensing_contacts,
  companies,
  contact_memory,
  adaptive_weight,
  reply_log,
} from '../../db/schema';
import { AppError } from '../../middleware/errorHandler';
import { logActivity } from '../../lib/activityLogger';
import type { CreateMeetingInput } from './meeting.schema';
import { autoCreateDealFromMeeting } from '../deals/deal.service';

const ENGINE_VERSION = 'meeting-intelligence-v1';

type MeetingStatus = 'scheduled' | 'confirmed' | 'completed' | 'cancelled' | 'no_show';
type MeetingType   = 'discovery' | 'pitch' | 'licensing' | 'sync' | 'partnership' | 'followup';
type ReplyStatus   =
  | 'positive' | 'interested' | 'meeting_requested'
  | 'needs_followup' | 'not_now' | 'rejected' | 'out_of_office' | 'unknown';

// ─── Talking Points ───────────────────────────────────────────────────────────

function generateTalkingPoints(ctx: {
  companyType:         string | null;
  companyTier:         string | null;
  opportunityScore:    number;
  relationshipStrength: number;
  pastCampaignCount:   number;
  prevReplyCount:      number;
  positiveReplies:     number;
}): string[] {
  const pts: string[] = [];

  if (ctx.relationshipStrength > 0.6) {
    pts.push('Open with acknowledgement of your ongoing relationship and prior email exchange.');
  } else if (ctx.prevReplyCount > 0) {
    pts.push('Reference the previous email thread to establish context and continuity.');
  } else {
    pts.push('Brief introduction: who you are, what you represent, and the purpose of this call.');
  }

  if (ctx.companyType === 'production_house' || ctx.companyType === 'film_studio') {
    pts.push('Present catalog with film/trailer-ready selections — lead with cinematic mood and fast sync clearance speed.');
  } else if (ctx.companyType === 'ad_agency' || ctx.companyType === 'brand') {
    pts.push('Focus on brand alignment: mood, energy score, and exclusivity options for commercial placements.');
  } else if (ctx.companyType === 'music_supervisor_firm') {
    pts.push('Lead with sync-ready assets, licensing simplicity, and turnaround speed on approvals.');
  } else if (ctx.companyType === 'streaming_platform') {
    pts.push('Highlight streaming performance metrics, genre fit, and editorial playlist potential.');
  } else {
    pts.push('Present core value proposition: catalog quality, mood versatility, and licensing flexibility.');
  }

  if (ctx.opportunityScore > 0.75) {
    pts.push('Strong opportunity score — present the top 2–3 tracks most suited to their recent productions.');
  } else if (ctx.opportunityScore > 0.50) {
    pts.push('Moderate fit detected — focus on understanding their current content pipeline before pitching.');
  } else {
    pts.push('Discovery focus — ask about upcoming productions and content calendar; refine pitch accordingly.');
  }

  if (ctx.companyTier === 'tier_a') {
    pts.push('Tier A company — be concise, have fully packaged materials ready to send within the hour post-call.');
  } else if (ctx.companyTier === 'tier_b') {
    pts.push('Explore multiple sync scenarios to find the best budget/fit combination for both sides.');
  }

  pts.push('Agree on concrete next steps before ending: track delivery timeline, approval window, or follow-up date.');

  return pts;
}

// ─── Meeting Brief ────────────────────────────────────────────────────────────

interface MeetingBrief {
  contact_summary: {
    name:                  string;
    role:                  string | null;
    email:                 string | null;
    company_name:          string | null;
    relationship_status:   string;
    relationship_strength: number;
    total_replies:         number;
    positive_replies:      number;
  };
  company_summary: {
    name:                string | null;
    type:                string | null;
    tier:                string | null;
    country:             string | null;
    avg_license_fee_usd: string | null;
  };
  opportunity_score:     number;
  past_outreach_history: { campaign_id: string; status: string; territory: string; created_at: string }[];
  previous_replies:      { id: string; status: string; confidence: string; subject: string; created_at: string }[];
  recommended_talking_points: string[];
  brief_generated_at:    string;
}

async function buildMeetingBrief(
  contactId:   string | null,
  campaignId:  string,
): Promise<MeetingBrief> {
  const [campaign] = await db
    .select()
    .from(outreach_campaign)
    .where(eq(outreach_campaign.id, campaignId))
    .limit(1);

  type ContactRow = typeof licensing_contacts.$inferSelect;
  type CompanyRow = typeof companies.$inferSelect;
  type MemoryRow  = typeof contact_memory.$inferSelect;

  let contact: ContactRow | null = null;
  let company: CompanyRow | null = null;
  let memory:  MemoryRow  | null = null;

  if (contactId) {
    const [c] = await db
      .select()
      .from(licensing_contacts)
      .where(eq(licensing_contacts.id, contactId))
      .limit(1);
    contact = c ?? null;

    if (contact?.company_id) {
      const [co] = await db
        .select()
        .from(companies)
        .where(eq(companies.id, contact.company_id))
        .limit(1);
      company = co ?? null;
    }

    const [m] = await db
      .select()
      .from(contact_memory)
      .where(eq(contact_memory.contact_id, contactId))
      .limit(1);
    memory = m ?? null;
  }

  const pastCampaigns = contactId
    ? await db
        .select({
          id:        outreach_campaign.id,
          status:    outreach_campaign.status,
          territory: outreach_campaign.territory,
          created_at: outreach_campaign.created_at,
        })
        .from(outreach_campaign)
        .where(and(
          eq(outreach_campaign.contact_id, contactId),
          ne(outreach_campaign.id, campaignId),
        ))
        .orderBy(desc(outreach_campaign.created_at))
        .limit(5)
    : [];

  const prevReplies = contactId
    ? await db
        .select({
          id:         reply_log.id,
          status:     reply_log.status,
          confidence: reply_log.confidence,
          subject:    reply_log.subject,
          created_at: reply_log.created_at,
        })
        .from(reply_log)
        .where(eq(reply_log.contact_id, contactId))
        .orderBy(desc(reply_log.created_at))
        .limit(10)
    : [];

  const opportunityScore     = parseFloat(String(campaign?.opportunity_score ?? '0'));
  const relationshipStrength = parseFloat(String(memory?.relationship_strength ?? '0'));

  const talkingPoints = generateTalkingPoints({
    companyType:          company?.type ?? null,
    companyTier:          company?.tier ?? null,
    opportunityScore,
    relationshipStrength,
    pastCampaignCount:    pastCampaigns.length,
    prevReplyCount:       prevReplies.length,
    positiveReplies:      memory?.positive_replies ?? 0,
  });

  return {
    contact_summary: {
      name:                  contact?.full_name ?? 'Unknown Contact',
      role:                  contact?.role ?? null,
      email:                 contact?.email ?? null,
      company_name:          company?.name ?? null,
      relationship_status:   contact?.relationship_status ?? 'prospect',
      relationship_strength: relationshipStrength,
      total_replies:         memory?.total_replies ?? 0,
      positive_replies:      memory?.positive_replies ?? 0,
    },
    company_summary: {
      name:                company?.name ?? null,
      type:                company?.type ?? null,
      tier:                company?.tier ?? null,
      country:             company?.country ?? null,
      avg_license_fee_usd: company?.avg_license_fee_usd
        ? String(company.avg_license_fee_usd) : null,
    },
    opportunity_score: opportunityScore,
    past_outreach_history: pastCampaigns.map(c => ({
      campaign_id: c.id,
      status:      c.status,
      territory:   c.territory,
      created_at:  c.created_at.toISOString(),
    })),
    previous_replies: prevReplies.map(r => ({
      id:         r.id,
      status:     r.status,
      confidence: String(r.confidence),
      subject:    r.subject,
      created_at: r.created_at.toISOString(),
    })),
    recommended_talking_points: talkingPoints,
    brief_generated_at: new Date().toISOString(),
  };
}

// ─── Preparation Score ────────────────────────────────────────────────────────

function computePreparationScore(
  relationshipStrength: number,
  replyConfidence:      number,
  opportunityScore:     number,
  totalReplies:         number,
  positiveReplies:      number,
): number {
  const engagementRate = totalReplies > 0 ? positiveReplies / totalReplies : 0;
  const raw =
    (relationshipStrength * 0.30) +
    (replyConfidence      * 0.25) +
    (opportunityScore     * 0.30) +
    (engagementRate       * 0.15);
  return parseFloat(Math.min(1, Math.max(0, raw)).toFixed(2));
}

// ─── Next Action ──────────────────────────────────────────────────────────────

function determineNextAction(
  replyStatus:          ReplyStatus,
  opportunityScore:     number,
  relationshipStrength: number,
  hasScheduledAt:       boolean,
): string {
  if (replyStatus === 'meeting_requested' && !hasScheduledAt) return 'send_calendly';
  if (hasScheduledAt && opportunityScore > 0.7)               return 'prepare_pitch';
  if (opportunityScore > 0.8 && relationshipStrength > 0.6)   return 'close_opportunity';
  if (!hasScheduledAt)                                         return 'confirm_time';
  if (relationshipStrength < 0.3)                              return 'send_followup';
  return 'prepare_pitch';
}

// ─── Contact Memory — meeting events ─────────────────────────────────────────

async function updateContactMemoryMeetings(
  contactId: string,
  event: 'new' | 'completed' | 'cancelled',
): Promise<void> {
  const [existing] = await db
    .select()
    .from(contact_memory)
    .where(eq(contact_memory.contact_id, contactId))
    .limit(1);

  if (!existing) return;

  const scheduledInc = event === 'new'       ? 1 : 0;
  const completedInc = event === 'completed' ? 1 : 0;
  const cancelledInc = event === 'cancelled' ? 1 : 0;

  await db
    .update(contact_memory)
    .set({
      meetings_scheduled: sql`${contact_memory.meetings_scheduled} + ${scheduledInc}`,
      meetings_completed: sql`${contact_memory.meetings_completed} + ${completedInc}`,
      meetings_cancelled: sql`${contact_memory.meetings_cancelled} + ${cancelledInc}`,
      memory_updated_at:  new Date(),
    })
    .where(eq(contact_memory.contact_id, contactId));

  if (event === 'completed' || event === 'new') {
    const [updated] = await db
      .select({
        meetings_scheduled: contact_memory.meetings_scheduled,
        meetings_completed: contact_memory.meetings_completed,
      })
      .from(contact_memory)
      .where(eq(contact_memory.contact_id, contactId))
      .limit(1);

    if (updated && updated.meetings_scheduled > 0) {
      const rate = updated.meetings_completed / updated.meetings_scheduled;
      await db
        .update(contact_memory)
        .set({ meeting_conversion_rate: String(rate.toFixed(4)) })
        .where(eq(contact_memory.contact_id, contactId));
    }
  }
}

// ─── Adaptive Signals ────────────────────────────────────────────────────────

async function updateAdaptiveMeetingSignals(event: MeetingStatus): Promise<void> {
  const factorMap: Partial<Record<MeetingStatus, string>> = {
    completed: 'meeting_success_rate',
    scheduled: 'meeting_completion_rate',
    no_show:   'meeting_no_show_rate',
  };
  const factor = factorMap[event];
  if (!factor) return;

  const [existing] = await db
    .select()
    .from(adaptive_weight)
    .where(eq(adaptive_weight.factor_name, factor))
    .limit(1);

  if (!existing) return;

  const newSample     = (existing.sample_size ?? 0) + 1;
  const newConfidence = Math.min(1, newSample / 20);
  await db
    .update(adaptive_weight)
    .set({
      sample_size:          newSample,
      confidence:           String(newConfidence.toFixed(2)),
      last_recalculated_at: new Date(),
      updated_at:           new Date(),
    })
    .where(eq(adaptive_weight.factor_name, factor));
}

// ─── Auto-create from Reply ───────────────────────────────────────────────────

export interface AutoCreateMeetingInput {
  campaign_id:      string;
  contact_id:       string | null;
  reply_log_id:     string;
  reply_status:     ReplyStatus;
  reply_confidence: number;
  reply_reasoning:  string | null;
}

export const autoCreateMeetingFromReply = async (
  input: AutoCreateMeetingInput,
): Promise<typeof meetings.$inferSelect | null> => {
  const { campaign_id, contact_id, reply_log_id, reply_status, reply_confidence } = input;

  try {
    const [campaign] = await db
      .select()
      .from(outreach_campaign)
      .where(eq(outreach_campaign.id, campaign_id))
      .limit(1);
    if (!campaign) return null;

    const resolvedContactId = contact_id ?? campaign.contact_id ?? null;

    let memory: typeof contact_memory.$inferSelect | null = null;
    if (resolvedContactId) {
      const [m] = await db
        .select()
        .from(contact_memory)
        .where(eq(contact_memory.contact_id, resolvedContactId))
        .limit(1);
      memory = m ?? null;
    }

    const opportunityScore     = parseFloat(String(campaign.opportunity_score ?? '0'));
    const relationshipStrength = parseFloat(String(memory?.relationship_strength ?? '0'));

    const brief = await buildMeetingBrief(resolvedContactId, campaign_id);

    const prepScore = computePreparationScore(
      relationshipStrength,
      reply_confidence,
      opportunityScore,
      memory?.total_replies ?? 0,
      memory?.positive_replies ?? 0,
    );

    const nextAction = determineNextAction(reply_status, opportunityScore, relationshipStrength, false);

    const meetingType: MeetingType = opportunityScore > 0.75 ? 'pitch' : 'discovery';

    const contactName = brief.contact_summary.name;
    const companyName = brief.company_summary.name ?? 'Unknown Company';
    const titleType   = meetingType.charAt(0).toUpperCase() + meetingType.slice(1);

    const [newMeeting] = await db
      .insert(meetings)
      .values({
        campaign_id:               campaign_id,
        contact_id:                resolvedContactId,
        reply_log_id:              reply_log_id,
        meeting_title:             `${titleType} Call — ${contactName} / ${companyName}`,
        meeting_type:              meetingType,
        timezone:                  'UTC',
        status:                    'scheduled',
        meeting_brief:             brief as unknown as Record<string, unknown>,
        meeting_preparation_score: String(prepScore),
        recommended_next_action:   nextAction,
        contact_context: resolvedContactId ? {
          contact_id:            resolvedContactId,
          name:                  brief.contact_summary.name,
          role:                  brief.contact_summary.role,
          relationship_strength: relationshipStrength,
        } : null,
        campaign_context: {
          campaign_id,
          status:            campaign.status,
          territory:         campaign.territory,
          opportunity_score: opportunityScore,
        },
        reply_context: {
          reply_log_id,
          status:     reply_status,
          confidence: reply_confidence,
          reasoning:  input.reply_reasoning,
        },
        confidence_score: String(reply_confidence.toFixed(2)),
        engine_version:   ENGINE_VERSION,
      })
      .returning();

    if (resolvedContactId) {
      await updateContactMemoryMeetings(resolvedContactId, 'new');
    }
    await updateAdaptiveMeetingSignals('scheduled');

    logActivity({
      eventType:  'meeting_auto_created',
      module:     'meetings',
      entityType: 'meeting',
      entityId:   newMeeting.id,
      title:      `Meeting auto-created from reply: ${newMeeting.meeting_title}`,
      severity:   'info',
      metadata: {
        campaign_id,
        contact_id: resolvedContactId,
        reply_log_id,
        meeting_type:       meetingType,
        preparation_score:  prepScore,
        next_action:        nextAction,
      },
    });

    return newMeeting;
  } catch (err) {
    console.error('[MeetingService] autoCreateMeetingFromReply failed:', err);
    return null;
  }
};

// ─── Create Meeting (manual) ──────────────────────────────────────────────────

export const createMeeting = async (input: CreateMeetingInput) => {
  const { campaign_id, contact_id, reply_log_id } = input;

  const [campaign] = await db
    .select()
    .from(outreach_campaign)
    .where(eq(outreach_campaign.id, campaign_id))
    .limit(1);
  if (!campaign) throw new AppError('Campaign not found', 404);

  if (contact_id) {
    const [c] = await db
      .select({ id: licensing_contacts.id })
      .from(licensing_contacts)
      .where(eq(licensing_contacts.id, contact_id))
      .limit(1);
    if (!c) throw new AppError('Contact not found', 404);
  }

  let replyData: typeof reply_log.$inferSelect | null = null;
  if (reply_log_id) {
    const [r] = await db
      .select()
      .from(reply_log)
      .where(eq(reply_log.id, reply_log_id))
      .limit(1);
    if (!r) throw new AppError('Reply log not found', 404);
    replyData = r;
  }

  const resolvedContactId = contact_id ?? campaign.contact_id ?? null;

  let memory: typeof contact_memory.$inferSelect | null = null;
  if (resolvedContactId) {
    const [m] = await db
      .select()
      .from(contact_memory)
      .where(eq(contact_memory.contact_id, resolvedContactId))
      .limit(1);
    memory = m ?? null;
  }

  const opportunityScore     = parseFloat(String(campaign.opportunity_score ?? '0'));
  const relationshipStrength = parseFloat(String(memory?.relationship_strength ?? '0'));
  const replyConfidence      = replyData ? parseFloat(String(replyData.confidence)) : 0;

  const brief = await buildMeetingBrief(resolvedContactId, campaign_id);

  const prepScore = computePreparationScore(
    relationshipStrength,
    replyConfidence,
    opportunityScore,
    memory?.total_replies ?? 0,
    memory?.positive_replies ?? 0,
  );

  const hasScheduledAt = !!input.scheduled_at;
  const nextAction = determineNextAction(
    (replyData?.status ?? 'unknown') as ReplyStatus,
    opportunityScore,
    relationshipStrength,
    hasScheduledAt,
  );

  const [newMeeting] = await db
    .insert(meetings)
    .values({
      campaign_id:               campaign_id,
      contact_id:                resolvedContactId,
      reply_log_id:              reply_log_id ?? null,
      meeting_title:             input.meeting_title,
      meeting_type:              input.meeting_type ?? 'discovery',
      scheduled_at:              input.scheduled_at ? new Date(input.scheduled_at) : null,
      timezone:                  input.timezone ?? 'UTC',
      meeting_link:              input.meeting_link ?? null,
      status:                    'scheduled',
      notes:                     input.notes ?? null,
      meeting_brief:             brief as unknown as Record<string, unknown>,
      meeting_preparation_score: String(prepScore),
      recommended_next_action:   nextAction,
      contact_context: resolvedContactId ? {
        contact_id:            resolvedContactId,
        name:                  brief.contact_summary.name,
        role:                  brief.contact_summary.role,
        relationship_strength: relationshipStrength,
      } : null,
      campaign_context: {
        campaign_id,
        status:            campaign.status,
        territory:         campaign.territory,
        opportunity_score: opportunityScore,
      },
      reply_context: replyData ? {
        reply_log_id:  replyData.id,
        status:        replyData.status,
        confidence:    String(replyData.confidence),
        reasoning:     replyData.reasoning,
      } : null,
      confidence_score: String(Math.max(replyConfidence, 0.50).toFixed(2)),
      engine_version:   ENGINE_VERSION,
    })
    .returning();

  if (resolvedContactId) {
    await updateContactMemoryMeetings(resolvedContactId, 'new');
  }
  await updateAdaptiveMeetingSignals('scheduled');

  logActivity({
    eventType:  'meeting_created',
    module:     'meetings',
    entityType: 'meeting',
    entityId:   newMeeting.id,
    title:      `Meeting created: ${newMeeting.meeting_title}`,
    severity:   'info',
    metadata: {
      campaign_id,
      contact_id:        resolvedContactId,
      meeting_type:      newMeeting.meeting_type,
      preparation_score: prepScore,
    },
  });

  return newMeeting;
};

// ─── List Meetings ────────────────────────────────────────────────────────────

export const listMeetings = async (limit = 100) => {
  const rows = await db
    .select()
    .from(meetings)
    .orderBy(desc(meetings.created_at))
    .limit(limit);

  if (!rows.length) {
    return { meetings: [], total: 0, fetched_at: new Date().toISOString() };
  }

  const campaignIds = [...new Set(rows.map(r => r.campaign_id))];
  const contactIds  = [...new Set(rows.map(r => r.contact_id).filter((id): id is string => id !== null))];

  const [campaignRows, contactRows] = await Promise.all([
    campaignIds.length > 0
      ? db.select({
          id:                outreach_campaign.id,
          status:            outreach_campaign.status,
          territory:         outreach_campaign.territory,
          opportunity_score: outreach_campaign.opportunity_score,
        }).from(outreach_campaign)
      : Promise.resolve([]),
    contactIds.length > 0
      ? db.select({
          id:        licensing_contacts.id,
          full_name: licensing_contacts.full_name,
          email:     licensing_contacts.email,
          role:      licensing_contacts.role,
        }).from(licensing_contacts)
      : Promise.resolve([]),
  ]);

  const campaignMap = new Map(campaignRows.map(c => [c.id, c]));
  const contactMap  = new Map(contactRows.map(c => [c.id, c]));

  const enriched = rows.map(m => ({
    ...m,
    campaign: campaignMap.get(m.campaign_id) ?? null,
    contact:  m.contact_id ? (contactMap.get(m.contact_id) ?? null) : null,
  }));

  return {
    meetings:   enriched,
    total:      enriched.length,
    fetched_at: new Date().toISOString(),
  };
};

// ─── Get Single Meeting ───────────────────────────────────────────────────────

export const getMeeting = async (id: string) => {
  const [meeting] = await db
    .select()
    .from(meetings)
    .where(eq(meetings.id, id))
    .limit(1);

  if (!meeting) throw new AppError('Meeting not found', 404);

  const [campaign, contact, replyRow] = await Promise.all([
    db.select({
      id:                outreach_campaign.id,
      status:            outreach_campaign.status,
      territory:         outreach_campaign.territory,
      opportunity_score: outreach_campaign.opportunity_score,
      company_id:        outreach_campaign.company_id,
      contact_id:        outreach_campaign.contact_id,
    })
    .from(outreach_campaign)
    .where(eq(outreach_campaign.id, meeting.campaign_id))
    .limit(1)
    .then(r => r[0] ?? null),

    meeting.contact_id
      ? db.select({
          id:                  licensing_contacts.id,
          full_name:           licensing_contacts.full_name,
          email:               licensing_contacts.email,
          role:                licensing_contacts.role,
          relationship_status: licensing_contacts.relationship_status,
        })
        .from(licensing_contacts)
        .where(eq(licensing_contacts.id, meeting.contact_id))
        .limit(1)
        .then(r => r[0] ?? null)
      : Promise.resolve(null),

    meeting.reply_log_id
      ? db.select()
        .from(reply_log)
        .where(eq(reply_log.id, meeting.reply_log_id))
        .limit(1)
        .then(r => r[0] ?? null)
      : Promise.resolve(null),
  ]);

  return { ...meeting, campaign, contact, reply_log: replyRow };
};

// ─── Update Status ────────────────────────────────────────────────────────────

export const updateMeetingStatus = async (id: string, status: string) => {
  const valid: MeetingStatus[] = ['scheduled', 'confirmed', 'completed', 'cancelled', 'no_show'];
  if (!valid.includes(status as MeetingStatus)) {
    throw new AppError(`Invalid status: ${status}. Must be one of: ${valid.join(', ')}`, 400);
  }

  const [meeting] = await db
    .select()
    .from(meetings)
    .where(eq(meetings.id, id))
    .limit(1);
  if (!meeting) throw new AppError('Meeting not found', 404);

  const [updated] = await db
    .update(meetings)
    .set({ status: status as MeetingStatus, updated_at: new Date() })
    .where(eq(meetings.id, id))
    .returning();

  if (meeting.contact_id) {
    if (status === 'completed') {
      await updateContactMemoryMeetings(meeting.contact_id, 'completed');
    } else if (status === 'cancelled' || status === 'no_show') {
      await updateContactMemoryMeetings(meeting.contact_id, 'cancelled');
    }
  }

  if (status === 'completed' || status === 'no_show') {
    await updateAdaptiveMeetingSignals(status as MeetingStatus);
  }

  // Auto-create a deal when meeting is marked completed
  if (status === 'completed') {
    autoCreateDealFromMeeting(id).catch(err =>
      console.error('[MeetingService] autoCreateDealFromMeeting error:', err),
    );
  }

  logActivity({
    eventType:  'meeting_status_updated',
    module:     'meetings',
    entityType: 'meeting',
    entityId:   id,
    title:      `Meeting status → "${status}": ${meeting.meeting_title}`,
    severity:   status === 'no_show' ? 'warning' : 'info',
    metadata:   { previous_status: meeting.status, new_status: status },
  });

  return updated;
};

// ─── Update Notes ─────────────────────────────────────────────────────────────

export const updateMeetingNotes = async (id: string, notes: string) => {
  const [meeting] = await db
    .select({ id: meetings.id })
    .from(meetings)
    .where(eq(meetings.id, id))
    .limit(1);
  if (!meeting) throw new AppError('Meeting not found', 404);

  const [updated] = await db
    .update(meetings)
    .set({ notes, updated_at: new Date() })
    .where(eq(meetings.id, id))
    .returning();

  return updated;
};

// ─── Analytics ───────────────────────────────────────────────────────────────

export const getMeetingAnalytics = async () => {
  const allMeetings = await db
    .select({
      status:                    meetings.status,
      meeting_type:              meetings.meeting_type,
      meeting_preparation_score: meetings.meeting_preparation_score,
    })
    .from(meetings);

  const total     = allMeetings.length;
  const scheduled = allMeetings.filter(m => m.status === 'scheduled').length;
  const confirmed = allMeetings.filter(m => m.status === 'confirmed').length;
  const completed = allMeetings.filter(m => m.status === 'completed').length;
  const cancelled = allMeetings.filter(m => m.status === 'cancelled').length;
  const no_show   = allMeetings.filter(m => m.status === 'no_show').length;

  const terminal         = completed + cancelled + no_show;
  const conversion_rate  = terminal > 0 ? parseFloat((completed / terminal).toFixed(4)) : 0;
  const completion_rate  = total    > 0 ? parseFloat((completed / total).toFixed(4))    : 0;
  const no_show_rate     = terminal > 0 ? parseFloat((no_show   / terminal).toFixed(4)) : 0;

  const scoredMeetings = allMeetings.filter(m => m.meeting_preparation_score != null);
  // Return avg as 0-100 for frontend display
  const avg_outcome_score = scoredMeetings.length > 0
    ? parseFloat(
        (scoredMeetings.reduce((sum, m) => sum + parseFloat(String(m.meeting_preparation_score ?? '0')), 0)
          / scoredMeetings.length * 100
        ).toFixed(1),
      )
    : 0;

  const by_type: Record<string, number> = {};
  for (const m of allMeetings) {
    if (m.meeting_type) by_type[m.meeting_type] = (by_type[m.meeting_type] ?? 0) + 1;
  }

  const adaptiveRows = await db
    .select()
    .from(adaptive_weight)
    .where(
      sql`${adaptive_weight.factor_name} IN ('meeting_success_rate','meeting_completion_rate','meeting_no_show_rate')`,
    );

  const adaptiveMap = new Map(adaptiveRows.map(r => [r.factor_name, r]));

  return {
    // canonical fields
    total_meetings:  total,
    scheduled,
    confirmed,
    completed,
    cancelled,
    no_show,
    conversion_rate,
    completion_rate,
    no_show_rate,
    // frontend-aligned aliases
    total,
    by_status: { scheduled, confirmed, completed, cancelled, no_show },
    avg_outcome_score,
    by_type,
    meetings_to_deal_rate: completion_rate,
    adaptive_signals: {
      meeting_success_rate:    adaptiveMap.get('meeting_success_rate')    ?? null,
      meeting_completion_rate: adaptiveMap.get('meeting_completion_rate') ?? null,
      meeting_no_show_rate:    adaptiveMap.get('meeting_no_show_rate')    ?? null,
    },
    computed_at: new Date().toISOString(),
  };
};

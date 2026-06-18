import { eq, desc, sql } from 'drizzle-orm';
import { db } from '../../db';
import {
  reply_log,
  outreach_campaign,
  licensing_contacts,
  contact_memory,
  adaptive_weight,
} from '../../db/schema';
import { AppError } from '../../middleware/errorHandler';
import { autoCreateMeetingFromReply } from '../meetings/meeting.service';
import type { IngestReplyInput } from './reply.schema';

const ENGINE_VERSION = 'reply-intelligence-v1';

// ─── Types ────────────────────────────────────────────────────────────────────

type ReplyStatus =
  | 'positive'
  | 'interested'
  | 'meeting_requested'
  | 'needs_followup'
  | 'not_now'
  | 'rejected'
  | 'out_of_office'
  | 'unknown';

interface Classification {
  status:                  ReplyStatus;
  confidence:              number;
  reasoning:               string;
  recommended_next_action: string;
}

// ─── Rule-based fallback classifier ──────────────────────────────────────────

function ruleBasedClassify(subject: string, body: string): Classification {
  const text = `${subject} ${body}`.toLowerCase();

  if (/out of office|ooo|on vacation|away until|will return|holiday|on leave/.test(text)) {
    return {
      status: 'out_of_office',
      confidence: 0.90,
      reasoning: 'Auto-reply or out-of-office keywords detected.',
      recommended_next_action: 'Re-send the outreach after the contact returns from leave.',
    };
  }

  if (/schedule|set up a (meeting|call)|book (a|time)|zoom|google meet|calendly|let me know when you.re free|when works for you/.test(text)) {
    return {
      status: 'meeting_requested',
      confidence: 0.88,
      reasoning: 'Contact is requesting a meeting or call to discuss further.',
      recommended_next_action: 'Reply immediately with calendar availability and a brief agenda.',
    };
  }

  if (/not interested|no thank|pass on this|not a fit|won.t work|not for us|decline|won.t be moving forward/.test(text)) {
    return {
      status: 'rejected',
      confidence: 0.92,
      reasoning: 'Contact has explicitly declined or stated this is not a fit.',
      recommended_next_action: 'Update contact notes, mark campaign closed, and revisit in 6 months with different material.',
    };
  }

  if (/sounds (great|good|interesting)|love to hear|tell me more|send (me |over |through )(more|the|a)|interested|absolutely|yes please|happy to listen|would (love|like) to/.test(text)) {
    return {
      status: 'interested',
      confidence: 0.82,
      reasoning: 'Contact has expressed positive interest and wants to learn more.',
      recommended_next_action: 'Send a follow-up with full pitch materials, stems, and licensing terms within 24 hours.',
    };
  }

  if (/great|perfect|love it|exactly what|appreciate you|thanks for sharing|wonderful|impressive/.test(text)) {
    return {
      status: 'positive',
      confidence: 0.75,
      reasoning: 'Reply contains positive language indicating a warm reception.',
      recommended_next_action: 'Follow up within 48 hours with a full proposal and pricing.',
    };
  }

  if (/not right now|currently working|very busy|at this time|maybe later|another time|touch base|circle back|follow.?up|get back to you/.test(text)) {
    return {
      status: 'not_now',
      confidence: 0.78,
      reasoning: 'Contact has acknowledged but deferred—timing is not right.',
      recommended_next_action: 'Schedule a follow-up reminder for 4–6 weeks and send a brief check-in then.',
    };
  }

  if (/send (me|us)|follow.?up|more information|drop|forward|share the|let me know/.test(text)) {
    return {
      status: 'needs_followup',
      confidence: 0.70,
      reasoning: 'Contact is asking for additional information or a follow-up action.',
      recommended_next_action: 'Prepare and send the requested materials within 24 hours.',
    };
  }

  return {
    status: 'unknown',
    confidence: 0.40,
    reasoning: 'No clear intent pattern detected in the reply text.',
    recommended_next_action: 'Review the reply manually and decide on the next step.',
  };
}

// ─── Anthropic classifier ─────────────────────────────────────────────────────

async function anthropicClassify(subject: string, body: string): Promise<Classification & { raw: string }> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error('No ANTHROPIC_API_KEY');

  const prompt = `You are an AI assistant for DATIAM OS, a music sync licensing platform.

Classify this incoming email reply from a music licensing contact.

Subject: ${subject}
Body: ${body}

Assign the reply to exactly one of these intent categories:
- positive: warm, appreciative, or generally favourable without specific next step
- interested: explicitly expressing interest, wanting to hear more
- meeting_requested: asking to schedule a call, meeting, or demo
- needs_followup: asking for more info, materials, or follow-up action
- not_now: polite deferral — wrong timing, currently busy
- rejected: explicit no, not a fit, decline
- out_of_office: automated or manual OOO reply
- unknown: cannot determine intent

Respond ONLY with valid JSON — no markdown, no text outside the JSON:
{
  "status": "<one of the above>",
  "confidence": <0.0 to 1.0>,
  "reasoning": "<one to two sentences explaining the classification>",
  "recommended_next_action": "<specific, actionable next step for the outreach team>"
}`;

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key':            apiKey,
      'anthropic-version':    '2023-06-01',
      'content-type':         'application/json',
    },
    body: JSON.stringify({
      model:      'claude-haiku-4-5-20251001',
      max_tokens: 500,
      messages:   [{ role: 'user', content: prompt }],
    }),
  });

  if (!response.ok) throw new Error(`Anthropic API error: ${response.status}`);

  const data = (await response.json()) as { content: Array<{ text: string }> };
  const raw  = data.content?.[0]?.text ?? '';

  const match = raw.match(/\{[\s\S]*\}/);
  if (!match) throw new Error('Failed to parse Anthropic response as JSON');

  const parsed = JSON.parse(match[0]) as Classification;

  const validStatuses: ReplyStatus[] = [
    'positive', 'interested', 'meeting_requested', 'needs_followup',
    'not_now', 'rejected', 'out_of_office', 'unknown',
  ];

  if (!validStatuses.includes(parsed.status)) {
    throw new Error(`Invalid status returned: ${parsed.status}`);
  }

  return { ...parsed, raw };
}

// ─── Campaign status mapping ──────────────────────────────────────────────────

type OutreachStatus = 'draft' | 'queued' | 'sent' | 'replied' | 'closed';

function campaignStatusForReply(replyStatus: ReplyStatus): OutreachStatus | null {
  switch (replyStatus) {
    case 'positive':
    case 'interested':
    case 'meeting_requested':
      return 'replied';
    case 'needs_followup':
      return 'replied';
    case 'rejected':
      return 'closed';
    default:
      return null; // no campaign status change for not_now / out_of_office / unknown
  }
}

// ─── Relationship strength delta ──────────────────────────────────────────────

function strengthDelta(status: ReplyStatus): number {
  switch (status) {
    case 'meeting_requested': return 0.15;
    case 'interested':        return 0.12;
    case 'positive':          return 0.10;
    case 'needs_followup':    return 0.06;
    case 'not_now':           return 0.02;
    case 'out_of_office':     return 0.01;
    case 'rejected':          return -0.10;
    default:                  return 0;
  }
}

function isPositive(status: ReplyStatus): boolean {
  return ['positive', 'interested', 'meeting_requested', 'needs_followup'].includes(status);
}

function isNegative(status: ReplyStatus): boolean {
  return status === 'rejected';
}

// ─── Upsert contact memory ────────────────────────────────────────────────────

async function updateContactMemory(contactId: string, status: ReplyStatus): Promise<void> {
  const delta  = strengthDelta(status);
  const posInc = isPositive(status) ? 1 : 0;
  const negInc = isNegative(status) ? 1 : 0;

  const [existing] = await db
    .select()
    .from(contact_memory)
    .where(eq(contact_memory.contact_id, contactId))
    .limit(1);

  if (existing) {
    const rawStrength    = parseFloat(String(existing.relationship_strength ?? '0'));
    const newStrength    = Math.min(1, Math.max(0, rawStrength + delta));

    await db
      .update(contact_memory)
      .set({
        total_replies:         sql`${contact_memory.total_replies} + 1`,
        positive_replies:      sql`${contact_memory.positive_replies} + ${posInc}`,
        negative_replies:      sql`${contact_memory.negative_replies} + ${negInc}`,
        relationship_strength: String(newStrength.toFixed(2)),
        memory_updated_at:     new Date(),
      })
      .where(eq(contact_memory.contact_id, contactId));
  } else {
    const initialStrength = Math.max(0, delta);
    await db.insert(contact_memory).values({
      contact_id:           contactId,
      total_replies:        1,
      positive_replies:     posInc,
      negative_replies:     negInc,
      relationship_strength: String(initialStrength.toFixed(2)),
    });
  }
}

// ─── Upsert adaptive weight signals ──────────────────────────────────────────

async function updateAdaptiveSignals(status: ReplyStatus): Promise<void> {
  if (isPositive(status)) {
    const [existing] = await db
      .select()
      .from(adaptive_weight)
      .where(eq(adaptive_weight.factor_name, 'reply_positive_rate'))
      .limit(1);

    if (existing) {
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
        .where(eq(adaptive_weight.factor_name, 'reply_positive_rate'));
    }
  }

  if (isNegative(status)) {
    const [existing] = await db
      .select()
      .from(adaptive_weight)
      .where(eq(adaptive_weight.factor_name, 'reply_rejection_rate'))
      .limit(1);

    if (existing) {
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
        .where(eq(adaptive_weight.factor_name, 'reply_rejection_rate'));
    }
  }
}

// ─── Ingest Reply ─────────────────────────────────────────────────────────────

export const ingestReply = async (input: IngestReplyInput) => {
  const { campaign_id, contact_id, subject, body } = input;

  // 1. Verify campaign exists
  const [campaign] = await db
    .select()
    .from(outreach_campaign)
    .where(eq(outreach_campaign.id, campaign_id))
    .limit(1);

  if (!campaign) throw new AppError('Campaign not found', 404);

  // 2. Verify contact exists if provided, else fall back to campaign contact
  const resolvedContactId = contact_id ?? campaign.contact_id ?? null;

  if (resolvedContactId) {
    const [contact] = await db
      .select({ id: licensing_contacts.id })
      .from(licensing_contacts)
      .where(eq(licensing_contacts.id, resolvedContactId))
      .limit(1);

    if (!contact) throw new AppError('Contact not found', 404);
  }

  // 3. Classify
  let classification: Classification;
  let rawAiResponse: string | null = null;
  let usedAI = false;

  if (process.env.ANTHROPIC_API_KEY) {
    try {
      const result = await anthropicClassify(subject, body);
      rawAiResponse = result.raw;
      classification = {
        status:                  result.status,
        confidence:              result.confidence,
        reasoning:               result.reasoning,
        recommended_next_action: result.recommended_next_action,
      };
      usedAI = true;
    } catch {
      classification = ruleBasedClassify(subject, body);
    }
  } else {
    classification = ruleBasedClassify(subject, body);
  }

  // 4. Write reply_log
  const [logRow] = await db
    .insert(reply_log)
    .values({
      campaign_id,
      contact_id:              resolvedContactId,
      subject,
      body,
      status:                  classification.status,
      confidence:              String(classification.confidence.toFixed(2)),
      reasoning:               classification.reasoning,
      recommended_next_action: classification.recommended_next_action,
      raw_ai_response:         rawAiResponse,
    })
    .returning();

  // 5. Update campaign status
  const newCampaignStatus = campaignStatusForReply(classification.status);
  if (newCampaignStatus && campaign.status !== 'closed') {
    await db
      .update(outreach_campaign)
      .set({ status: newCampaignStatus, updated_at: new Date() })
      .where(eq(outreach_campaign.id, campaign_id));
  }

  // 6. Update contact memory
  if (resolvedContactId) {
    await updateContactMemory(resolvedContactId, classification.status);
  }

  // 7. Update adaptive learning signals
  await updateAdaptiveSignals(classification.status);

  // 8. Auto-create meeting when reply signals a meeting request
  let autoMeeting: Record<string, unknown> | null = null;
  if (classification.status === 'meeting_requested') {
    const created = await autoCreateMeetingFromReply({
      campaign_id:      campaign_id,
      contact_id:       resolvedContactId,
      reply_log_id:     logRow.id,
      reply_status:     classification.status,
      reply_confidence: classification.confidence,
      reply_reasoning:  classification.reasoning,
    });
    if (created) {
      autoMeeting = {
        id:                        created.id,
        meeting_title:             created.meeting_title,
        meeting_type:              created.meeting_type,
        status:                    created.status,
        meeting_preparation_score: created.meeting_preparation_score,
        recommended_next_action:   created.recommended_next_action,
        engine_version:            created.engine_version,
      };
    }
  }

  return {
    reply_log:       logRow,
    classification,
    campaign_status: newCampaignStatus ?? campaign.status,
    used_ai:         usedAI,
    engine_version:  ENGINE_VERSION,
    meeting_created: autoMeeting,
  };
};

// ─── List reply logs ──────────────────────────────────────────────────────────

export const listReplyLogs = async (limit = 100) => {
  const logs = await db
    .select()
    .from(reply_log)
    .orderBy(desc(reply_log.created_at))
    .limit(limit);

  const campaignIds = [...new Set(logs.map((l) => l.campaign_id))];
  const contactIds  = [...new Set(logs.map((l) => l.contact_id).filter((id): id is string => id !== null))];

  const [campaignRows, contactRows] = await Promise.all([
    campaignIds.length > 0
      ? db
          .select({
            id:        outreach_campaign.id,
            status:    outreach_campaign.status,
            territory: outreach_campaign.territory,
          })
          .from(outreach_campaign)
      : Promise.resolve([]),
    contactIds.length > 0
      ? db
          .select({
            id:        licensing_contacts.id,
            full_name: licensing_contacts.full_name,
            email:     licensing_contacts.email,
            role:      licensing_contacts.role,
          })
          .from(licensing_contacts)
      : Promise.resolve([]),
  ]);

  const campaignMap = new Map(campaignRows.map((c) => [c.id, c]));
  const contactMap  = new Map(contactRows.map((c) => [c.id, c]));

  const enriched = logs.map((l) => ({
    ...l,
    campaign: campaignMap.get(l.campaign_id) ?? null,
    contact:  l.contact_id ? (contactMap.get(l.contact_id) ?? null) : null,
  }));

  return {
    logs:       enriched,
    total:      enriched.length,
    fetched_at: new Date().toISOString(),
  };
};

// ─── Get single reply log ─────────────────────────────────────────────────────

export const getReplyLog = async (id: string) => {
  const [log] = await db
    .select()
    .from(reply_log)
    .where(eq(reply_log.id, id))
    .limit(1);

  if (!log) throw new AppError('Reply log not found', 404);

  const [campaign, contact] = await Promise.all([
    db
      .select({
        id:         outreach_campaign.id,
        status:     outreach_campaign.status,
        territory:  outreach_campaign.territory,
        company_id: outreach_campaign.company_id,
      })
      .from(outreach_campaign)
      .where(eq(outreach_campaign.id, log.campaign_id))
      .limit(1)
      .then((rows) => rows[0] ?? null),
    log.contact_id
      ? db
          .select({
            id:        licensing_contacts.id,
            full_name: licensing_contacts.full_name,
            email:     licensing_contacts.email,
            role:      licensing_contacts.role,
          })
          .from(licensing_contacts)
          .where(eq(licensing_contacts.id, log.contact_id))
          .limit(1)
          .then((rows) => rows[0] ?? null)
      : Promise.resolve(null),
  ]);

  return { ...log, campaign, contact };
};

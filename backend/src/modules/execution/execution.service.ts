import { eq, desc } from 'drizzle-orm';
import { db } from '../../db';
import {
  outreach_campaign,
  outreach_message,
  licensing_contacts,
  execution_log,
  companies,
} from '../../db/schema';
import { AppError } from '../../middleware/errorHandler';
import { sendEmail, detectProvider } from '../../lib/emailProviders';
import type { ProviderName } from '../../lib/emailProviders';
import type { SendCampaignInput } from './execution.schema';

const ENGINE_VERSION = 'execution-v1';

// ─── Send Campaign ────────────────────────────────────────────────────────────

export const sendCampaign = async (input: SendCampaignInput) => {
  const { campaign_id, provider, subject } = input;

  // 1. Load campaign
  const [campaign] = await db
    .select()
    .from(outreach_campaign)
    .where(eq(outreach_campaign.id, campaign_id))
    .limit(1);

  if (!campaign) throw new AppError('Campaign not found', 404);
  if (campaign.status === 'sent') throw new AppError('Campaign has already been sent', 409);

  // 2. Load the most recent message for this campaign
  const [message] = await db
    .select()
    .from(outreach_message)
    .where(eq(outreach_message.campaign_id, campaign_id))
    .orderBy(desc(outreach_message.created_at))
    .limit(1);

  if (!message) throw new AppError('No message found for this campaign', 404);

  // 3. Resolve contact + email
  let recipientEmail: string | null = null;
  let contactId: string | null = campaign.contact_id ?? null;

  if (contactId) {
    const [contact] = await db
      .select()
      .from(licensing_contacts)
      .where(eq(licensing_contacts.id, contactId))
      .limit(1);
    recipientEmail = contact?.email ?? null;
  }

  if (!recipientEmail) {
    throw new AppError(
      'No recipient email. Campaign contact must have a valid email address.',
      400,
    );
  }

  // 4. Detect/validate provider
  const resolvedProvider: ProviderName = (provider as ProviderName | undefined) ?? detectProvider();

  // 5. Compose email subject
  const [company] = await db
    .select({ name: companies.name })
    .from(companies)
    .where(eq(companies.id, campaign.company_id))
    .limit(1);

  const emailSubject =
    subject ??
    `Sync Licensing Opportunity — ${company?.name ?? campaign.company_id} (${campaign.territory})`;

  // 6. Mark campaign + message as queued
  await Promise.all([
    db
      .update(outreach_campaign)
      .set({ status: 'queued', updated_at: new Date() })
      .where(eq(outreach_campaign.id, campaign_id)),
    db
      .update(outreach_message)
      .set({ status: 'queued', updated_at: new Date() })
      .where(eq(outreach_message.id, message.id)),
  ]);

  // 7. Send email
  const sentAt = new Date();
  let sendResult: Awaited<ReturnType<typeof sendEmail>>;
  try {
    sendResult = await sendEmail(
      { to: recipientEmail, subject: emailSubject, text: message.pitch },
      resolvedProvider,
    );
  } catch (err) {
    sendResult = {
      success: false,
      provider: resolvedProvider,
      error: err instanceof Error ? err.message : String(err),
    };
  }

  const deliveryStatus = sendResult.success ? 'sent' : 'failed';

  // 8. Write execution_log row
  const [logRow] = await db
    .insert(execution_log)
    .values({
      campaign_id,
      message_id:           message.id,
      contact_id:           contactId,
      provider:             sendResult.provider,
      recipient_email:      recipientEmail,
      subject:              emailSubject,
      delivery_status:      deliveryStatus,
      sent_at:              sendResult.success ? sentAt : null,
      error_message:        sendResult.error ?? null,
      provider_message_id:  sendResult.message_id ?? null,
      metadata: {
        engine_version:    ENGINE_VERSION,
        campaign_territory: campaign.territory,
        opportunity_score:  campaign.opportunity_score,
      },
    })
    .returning();

  // 9. Update campaign + message to final status
  //    Roll back to 'draft' on failure so the campaign can be retried
  const finalStatus = sendResult.success ? ('sent' as const) : ('draft' as const);

  await Promise.all([
    db
      .update(outreach_campaign)
      .set({ status: finalStatus, updated_at: new Date() })
      .where(eq(outreach_campaign.id, campaign_id)),
    db
      .update(outreach_message)
      .set({ status: finalStatus, updated_at: new Date() })
      .where(eq(outreach_message.id, message.id)),
  ]);

  return {
    log:             logRow,
    send_result:     sendResult,
    campaign_status: finalStatus,
    engine_version:  ENGINE_VERSION,
    executed_at:     sentAt.toISOString(),
  };
};

// ─── List execution logs ──────────────────────────────────────────────────────

export const listExecutionLogs = async (limit = 100) => {
  const logs = await db
    .select()
    .from(execution_log)
    .orderBy(desc(execution_log.created_at))
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
            company_id: outreach_campaign.company_id,
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
  const contactMap  = new Map(contactRows.map((c)  => [c.id, c]));

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

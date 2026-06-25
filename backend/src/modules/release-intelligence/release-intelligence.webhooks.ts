import { logActivity } from '../../lib/activityLogger';

const N8N_WEBHOOK_SECRET  = process.env.N8N_WEBHOOK_SECRET  ?? '';
const N8N_BASE_URL        = process.env.N8N_WEBHOOK_BASE_URL ?? '';

type WebhookEvent =
  | 'release.created'
  | 'release.updated'
  | 'release.published'
  | 'release.campaign.started'
  | 'release.campaign.completed';

interface WebhookPayload {
  event: WebhookEvent;
  timestamp: string;
  data: Record<string, unknown>;
}

async function fireWebhook(event: WebhookEvent, data: Record<string, unknown>): Promise<void> {
  if (!N8N_BASE_URL) return;

  const payload: WebhookPayload = { event, timestamp: new Date().toISOString(), data };

  try {
    const res = await fetch(`${N8N_BASE_URL}/webhook/release-intelligence`, {
      method: 'POST',
      headers: {
        'Content-Type':    'application/json',
        'X-DATIAM-Secret': N8N_WEBHOOK_SECRET,
        'X-DATIAM-Event':  event,
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) console.warn(`[Webhook] ${event} → HTTP ${res.status}`);
  } catch (err) {
    console.warn(`[Webhook] ${event} failed silently:`, (err as Error).message);
  }
}

export async function onReleaseCreated(release: Record<string, unknown>): Promise<void> {
  logActivity({
    eventType:  'release_created',
    module:     'release-intelligence',
    entityType: 'release',
    entityId:   release.id as string,
    title:      `Release created: ${release.release_title ?? release.title}`,
    severity:   'info',
    metadata:   { release_id: release.id, artist_id: release.artist_id },
  });
  await fireWebhook('release.created', { release });
}

export async function onReleaseUpdated(
  release: Record<string, unknown>,
  changes: Record<string, unknown>,
): Promise<void> {
  await fireWebhook('release.updated', { release, changes });
}

export async function onReleasePublished(release: Record<string, unknown>): Promise<void> {
  logActivity({
    eventType:  'release_published',
    module:     'release-intelligence',
    entityType: 'release',
    entityId:   release.id as string,
    title:      `Release published: ${release.release_title ?? release.title}`,
    severity:   'info',
    metadata:   { release_id: release.id },
  });
  await fireWebhook('release.published', { release });
}

export async function onCampaignStarted(
  campaign: Record<string, unknown>,
  release: Record<string, unknown>,
): Promise<void> {
  logActivity({
    eventType:  'campaign_started',
    module:     'release-intelligence',
    entityType: 'release_campaign',
    entityId:   campaign.id as string,
    title:      `Campaign started: ${campaign.title}`,
    severity:   'info',
    metadata:   { campaign_id: campaign.id, release_id: release.id, campaign_type: campaign.campaign_type },
  });
  await fireWebhook('release.campaign.started', { campaign, release });
}

export async function onCampaignCompleted(
  campaign: Record<string, unknown>,
  release: Record<string, unknown>,
): Promise<void> {
  logActivity({
    eventType:  'campaign_completed',
    module:     'release-intelligence',
    entityType: 'release_campaign',
    entityId:   campaign.id as string,
    title:      `Campaign completed: ${campaign.title}`,
    severity:   'info',
    metadata:   { campaign_id: campaign.id, release_id: release.id, campaign_type: campaign.campaign_type },
  });
  await fireWebhook('release.campaign.completed', { campaign, release });
}

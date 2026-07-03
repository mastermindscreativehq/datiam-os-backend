import { dispatchEvent } from '../automation/automation.service';

const N8N_WEBHOOK_SECRET = process.env.N8N_WEBHOOK_SECRET ?? '';
const N8N_BASE_URL = process.env.N8N_WEBHOOK_BASE_URL ?? '';

type ReleaseIntelEvent =
  | 'release.intel.analyzed'
  | 'release.intel.brief.generated'
  | 'release.intel.mission.created'
  | 'release.intel.failed';

interface WebhookPayload {
  event: ReleaseIntelEvent;
  timestamp: string;
  data: Record<string, unknown>;
}

/**
 * n8n is execution-only — this is a fire-and-forget notification of state
 * DATIAM has already computed and persisted, never a place business logic runs.
 */
async function fireWebhook(event: ReleaseIntelEvent, data: Record<string, unknown>): Promise<void> {
  if (!N8N_BASE_URL) return;

  const payload: WebhookPayload = { event, timestamp: new Date().toISOString(), data };

  try {
    const res = await fetch(`${N8N_BASE_URL}/webhook/release-intel`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-DATIAM-Secret': N8N_WEBHOOK_SECRET,
        'X-DATIAM-Event': event,
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) console.warn(`[Webhook] ${event} → HTTP ${res.status}`);
  } catch (err) {
    console.warn(`[Webhook] ${event} failed silently:`, (err as Error).message);
  }
}

/**
 * Fires both the direct n8n webhook and the central automation registry
 * (workflow_registry / retry / dead-letter infrastructure) so any workflow
 * subscribed to this event name is notified, not just a hardcoded endpoint.
 */
async function notify(event: ReleaseIntelEvent, data: Record<string, unknown>): Promise<void> {
  await Promise.allSettled([fireWebhook(event, data), dispatchEvent(event, data)]);
}

export async function onReleaseIntelAnalyzed(releaseId: string, data: Record<string, unknown>): Promise<void> {
  await notify('release.intel.analyzed', { release_id: releaseId, ...data });
}

export async function onReleaseIntelBriefGenerated(releaseId: string, data: Record<string, unknown>): Promise<void> {
  await notify('release.intel.brief.generated', { release_id: releaseId, ...data });
}

export async function onReleaseIntelMissionsCreated(releaseId: string, missionTypes: string[]): Promise<void> {
  await notify('release.intel.mission.created', { release_id: releaseId, mission_count: missionTypes.length, mission_types: missionTypes });
}

export async function onReleaseIntelFailed(releaseId: string, reason: string): Promise<void> {
  await notify('release.intel.failed', { release_id: releaseId, reason });
}

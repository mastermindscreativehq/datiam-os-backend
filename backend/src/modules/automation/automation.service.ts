import { eq, desc, and, sql } from 'drizzle-orm';
import { db } from '../../db';
import { automation_runs, workflow_registry } from '../../db/schema';
import { AppError } from '../../middleware/errorHandler';
import { logActivity } from '../../lib/activityLogger';
import type {
  WebhookInput,
  CreateRunInput,
  UpdateRunInput,
  RunHistoryQuery,
  CreateWorkflowInput,
  UpdateWorkflowInput,
  TriggerWorkflowInput,
} from './automation.schema';

const N8N_BASE_URL    = process.env.N8N_WEBHOOK_BASE_URL ?? '';
const N8N_SECRET      = process.env.N8N_WEBHOOK_SECRET   ?? '';
const TRIGGER_TIMEOUT = 8000; // ms per attempt

// ── Inbound webhook (n8n → DATIAM) ─────────────────────────────────────────

export const receiveWebhook = async (input: WebhookInput, secret?: string) => {
  const configuredSecret = process.env.N8N_WEBHOOK_SECRET;
  if (configuredSecret && secret !== configuredSecret) {
    throw new AppError('Invalid webhook secret', 401);
  }

  const [run] = await db
    .insert(automation_runs)
    .values({
      workflow_name: input.workflow_name,
      source: input.source ?? 'n8n',
      status: 'running',
      payload: input.payload ?? {},
    })
    .returning();

  logActivity({
    eventType: 'automation_run.logged',
    module: 'automation',
    entityType: 'automation_run',
    entityId: run.id,
    title: `Automation started: ${input.workflow_name}`,
    severity: 'info',
    metadata: { source: input.source ?? 'n8n', runId: run.id },
  });

  await db
    .update(automation_runs)
    .set({ status: 'success', result: { processed: true, processed_at: new Date().toISOString() } })
    .where(eq(automation_runs.id, run.id));

  logActivity({
    eventType: 'automation_run.completed',
    module: 'automation',
    entityType: 'automation_run',
    entityId: run.id,
    title: `Automation completed: ${input.workflow_name}`,
    severity: 'info',
    metadata: { runId: run.id },
  });

  return { run_id: run.id, workflow: input.workflow_name, status: 'success' };
};

// ── Automation Runs CRUD ────────────────────────────────────────────────────

export const getAutomationRuns = async () => {
  return db
    .select()
    .from(automation_runs)
    .orderBy(desc(automation_runs.created_at))
    .limit(50);
};

export const getRunHistory = async (query: RunHistoryQuery) => {
  const conditions = [];
  if (query.status) conditions.push(eq(automation_runs.status, query.status));
  if (query.source) conditions.push(eq(automation_runs.source, query.source));
  if (query.event)  conditions.push(eq(automation_runs.triggered_by_event, query.event));

  const rows = await db
    .select()
    .from(automation_runs)
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(desc(automation_runs.created_at))
    .limit(query.limit)
    .offset(query.offset);

  const [{ total }] = await db
    .select({ total: sql<number>`count(*)::int` })
    .from(automation_runs)
    .where(conditions.length ? and(...conditions) : undefined);

  return { runs: rows, total, limit: query.limit, offset: query.offset };
};

export const createAutomationRun = async (input: CreateRunInput) => {
  const [run] = await db
    .insert(automation_runs)
    .values({
      workflow_name: input.workflow_name,
      source: input.source,
      status: input.status,
      payload: input.payload ?? {},
      result: input.result ?? {},
    })
    .returning();

  const isFailed = input.status === 'failed';
  logActivity({
    eventType: isFailed ? 'automation_run.failed' : 'automation_run.logged',
    module: 'automation',
    entityType: 'automation_run',
    entityId: run.id,
    title: isFailed ? `Automation failed: ${input.workflow_name}` : `Automation run logged: ${input.workflow_name}`,
    severity: isFailed ? 'error' : 'info',
    metadata: { source: input.source, runId: run.id, status: input.status },
  });

  return run;
};

export const updateAutomationRun = async (id: string, input: UpdateRunInput) => {
  const [existing] = await db.select().from(automation_runs).where(eq(automation_runs.id, id)).limit(1);
  if (!existing) throw new AppError('Automation run not found', 404);

  const [run] = await db
    .update(automation_runs)
    .set({ status: input.status, ...(input.result ? { result: input.result } : {}) })
    .where(eq(automation_runs.id, id))
    .returning();

  return run;
};

export const deleteAutomationRun = async (id: string) => {
  const [deleted] = await db.delete(automation_runs).where(eq(automation_runs.id, id)).returning();
  if (!deleted) throw new AppError('Automation run not found', 404);
  return { deleted: true, id, workflow_name: deleted.workflow_name };
};

export const retryRun = async (id: string) => {
  const [run] = await db.select().from(automation_runs).where(eq(automation_runs.id, id)).limit(1);
  if (!run) throw new AppError('Automation run not found', 404);
  if (run.status !== 'failed') throw new AppError('Only failed runs can be retried', 400);

  return triggerByName(run.workflow_name, run.triggered_by_event ?? 'manual.retry', (run.payload as Record<string, unknown>) ?? {});
};

// ── Workflow Registry ───────────────────────────────────────────────────────

export const listWorkflows = async () => {
  return db.select().from(workflow_registry).orderBy(workflow_registry.name);
};

export const getWorkflowById = async (id: string) => {
  const [wf] = await db.select().from(workflow_registry).where(eq(workflow_registry.id, id)).limit(1);
  if (!wf) throw new AppError('Workflow not found', 404);
  return wf;
};

export const createWorkflow = async (input: CreateWorkflowInput) => {
  const [wf] = await db
    .insert(workflow_registry)
    .values({
      name: input.name,
      description: input.description,
      event_triggers: input.event_triggers,
      n8n_workflow_id: input.n8n_workflow_id,
      webhook_path: input.webhook_path,
      is_active: input.is_active ?? true,
      metadata: input.metadata,
    })
    .returning();

  logActivity({
    eventType: 'workflow.registered',
    module: 'automation',
    entityType: 'workflow_registry',
    entityId: wf.id,
    title: `Workflow registered: ${wf.name}`,
    severity: 'info',
    metadata: { workflowId: wf.id, events: wf.event_triggers },
  });

  return wf;
};

export const updateWorkflow = async (id: string, input: UpdateWorkflowInput) => {
  const [existing] = await db.select().from(workflow_registry).where(eq(workflow_registry.id, id)).limit(1);
  if (!existing) throw new AppError('Workflow not found', 404);

  const [wf] = await db
    .update(workflow_registry)
    .set({
      ...(input.name             !== undefined ? { name: input.name }                       : {}),
      ...(input.description      !== undefined ? { description: input.description }         : {}),
      ...(input.event_triggers   !== undefined ? { event_triggers: input.event_triggers }   : {}),
      ...(input.n8n_workflow_id  !== undefined ? { n8n_workflow_id: input.n8n_workflow_id } : {}),
      ...(input.webhook_path     !== undefined ? { webhook_path: input.webhook_path }       : {}),
      ...(input.is_active        !== undefined ? { is_active: input.is_active }             : {}),
      ...(input.metadata         !== undefined ? { metadata: input.metadata }               : {}),
      updated_at: new Date(),
    })
    .where(eq(workflow_registry.id, id))
    .returning();

  return wf;
};

export const deleteWorkflow = async (id: string) => {
  const [deleted] = await db.delete(workflow_registry).where(eq(workflow_registry.id, id)).returning();
  if (!deleted) throw new AppError('Workflow not found', 404);
  return { deleted: true, id, name: deleted.name };
};

// ── Trigger Engine ──────────────────────────────────────────────────────────

async function attemptFire(
  webhookPath: string,
  payload: Record<string, unknown>,
): Promise<{ ok: boolean; status?: number; error?: string }> {
  if (!N8N_BASE_URL) return { ok: false, error: 'N8N_WEBHOOK_BASE_URL not configured' };

  try {
    const url = `${N8N_BASE_URL}${webhookPath}`;
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type':    'application/json',
        'X-DATIAM-Secret': N8N_SECRET,
        'X-DATIAM-Event':  String(payload.event ?? ''),
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(TRIGGER_TIMEOUT),
    });
    return { ok: res.ok, status: res.status };
  } catch (err) {
    return { ok: false, error: (err as Error).message };
  }
}

async function sleep(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}

export const triggerWorkflow = async (workflowId: string, input: TriggerWorkflowInput) => {
  const wf = await getWorkflowById(workflowId);
  if (!wf.is_active) throw new AppError('Workflow is inactive', 400);

  return triggerByName(wf.name, input.event, input.data ?? {}, workflowId);
};

async function triggerByName(
  workflowName: string,
  event: string,
  data: Record<string, unknown>,
  registryId?: string,
) {
  // Look up the webhook path from registry if not provided
  let webhookPath = '/webhook/release-intelligence';
  if (registryId) {
    const [wf] = await db.select().from(workflow_registry).where(eq(workflow_registry.id, registryId)).limit(1);
    if (wf?.webhook_path) webhookPath = wf.webhook_path;
  } else {
    const [wf] = await db.select().from(workflow_registry).where(eq(workflow_registry.name, workflowName)).limit(1);
    if (wf?.webhook_path) webhookPath = wf.webhook_path;
    if (wf?.id) registryId = wf.id;
  }

  const payload = { event, timestamp: new Date().toISOString(), data };
  const startMs = Date.now();
  const maxRetries = 3;
  let attempt = 0;
  let lastError = '';

  const [run] = await db
    .insert(automation_runs)
    .values({
      workflow_name: workflowName,
      source: 'backend',
      status: 'running',
      payload,
      triggered_by_event: event,
      workflow_registry_id: registryId ?? null,
      max_retries: maxRetries,
    })
    .returning();

  while (attempt < maxRetries) {
    attempt++;
    const result = await attemptFire(webhookPath, payload);

    if (result.ok) {
      const durationMs = Date.now() - startMs;
      await db
        .update(automation_runs)
        .set({ status: 'success', result: { fired: true, attempt, duration_ms: durationMs }, duration_ms: durationMs, retry_count: attempt - 1 })
        .where(eq(automation_runs.id, run.id));

      if (registryId) {
        await db
          .update(workflow_registry)
          .set({
            last_run_at: new Date(),
            last_run_status: 'success',
            total_runs: sql`${workflow_registry.total_runs} + 1`,
            success_count: sql`${workflow_registry.success_count} + 1`,
            updated_at: new Date(),
          })
          .where(eq(workflow_registry.id, registryId));
      }

      logActivity({
        eventType: 'automation_run.completed',
        module: 'automation',
        entityType: 'automation_run',
        entityId: run.id,
        title: `Workflow fired: ${workflowName}`,
        severity: 'info',
        metadata: { event, attempt, durationMs },
      });

      return { run_id: run.id, workflow: workflowName, status: 'success', attempt };
    }

    lastError = result.error ?? `HTTP ${result.status}`;
    if (attempt < maxRetries) await sleep(1000 * attempt);
  }

  const durationMs = Date.now() - startMs;
  await db
    .update(automation_runs)
    .set({ status: 'failed', error_message: lastError, duration_ms: durationMs, retry_count: attempt - 1, result: { fired: false, attempts: attempt, error: lastError } })
    .where(eq(automation_runs.id, run.id));

  if (registryId) {
    await db
      .update(workflow_registry)
      .set({
        last_run_at: new Date(),
        last_run_status: 'failed',
        total_runs: sql`${workflow_registry.total_runs} + 1`,
        failed_count: sql`${workflow_registry.failed_count} + 1`,
        updated_at: new Date(),
      })
      .where(eq(workflow_registry.id, registryId));
  }

  logActivity({
    eventType: 'automation_run.failed',
    module: 'automation',
    entityType: 'automation_run',
    entityId: run.id,
    title: `Workflow failed: ${workflowName}`,
    severity: 'error',
    metadata: { event, attempts: attempt, error: lastError },
  });

  return { run_id: run.id, workflow: workflowName, status: 'failed', attempts: attempt, error: lastError };
}

// ── Dispatch event to all matching workflows ────────────────────────────────

export const dispatchEvent = async (event: string, data: Record<string, unknown>) => {
  const allWorkflows = await db
    .select()
    .from(workflow_registry)
    .where(eq(workflow_registry.is_active, true));

  const matching = allWorkflows.filter(wf =>
    wf.event_triggers.includes(event),
  );

  const results = await Promise.allSettled(
    matching.map(wf =>
      triggerByName(wf.name, event, data, wf.id),
    ),
  );

  return {
    event,
    dispatched: matching.length,
    results: results.map((r, i) => ({
      workflow: matching[i].name,
      status: r.status === 'fulfilled' ? r.value.status : 'error',
      error: r.status === 'rejected' ? String(r.reason) : undefined,
    })),
  };
};

// ── Stats (dashboard) ───────────────────────────────────────────────────────

export const getAutomationStats = async () => {
  const [totals] = await db
    .select({
      total_runs:    sql<number>`count(*)::int`,
      success_count: sql<number>`count(*) filter (where status = 'success')::int`,
      failed_count:  sql<number>`count(*) filter (where status = 'failed')::int`,
      running_count: sql<number>`count(*) filter (where status = 'running')::int`,
    })
    .from(automation_runs);

  const [todayFailed] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(automation_runs)
    .where(sql`status = 'failed' AND created_at >= now() - interval '24 hours'`);

  const [todaySuccess] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(automation_runs)
    .where(sql`status = 'success' AND created_at >= now() - interval '24 hours'`);

  const lastRun = await db
    .select()
    .from(automation_runs)
    .orderBy(desc(automation_runs.created_at))
    .limit(1);

  const workflows = await db.select().from(workflow_registry).orderBy(workflow_registry.name);
  const activeWorkflows  = workflows.filter(w => w.is_active).length;
  const totalWorkflows   = workflows.length;

  const successRate = totals.total_runs > 0
    ? Math.round((totals.success_count / totals.total_runs) * 100)
    : 100;

  const queueHealth =
    totals.running_count > 10 ? 'overloaded' :
    totals.failed_count > totals.total_runs * 0.3 ? 'degraded' :
    todayFailed.count > 0 ? 'warning' : 'healthy';

  return {
    overview: {
      totalWorkflows,
      activeWorkflows,
      totalRuns:    totals.total_runs,
      successCount: totals.success_count,
      failedCount:  totals.failed_count,
      runningCount: totals.running_count,
      successRate,
      queueHealth,
    },
    today: {
      successCount: todaySuccess.count,
      failedCount:  todayFailed.count,
    },
    lastRun: lastRun[0] ?? null,
    workflows,
  };
};

export const getEventTypes = () => ({
  events: [
    // Catalog & Artist events
    'artist.created',
    'artist.updated',
    'song.created',
    'song.updated',
    'catalog.release.created',
    'catalog.release.updated',
    'asset.uploaded',
    'credit.updated',
    'document.uploaded',
    // Release Intelligence events
    'release.created',
    'release.updated',
    'release.published',
    'release.campaign.started',
    'release.campaign.completed',
    // Release Intel (orchestration layer) events
    'release.intel.analyzed',
    'release.intel.brief.generated',
    'release.intel.mission.created',
    'release.intel.failed',
  ],
});

// ── N8n Health Check ────────────────────────────────────────────────────────

export const checkN8nHealth = async () => {
  if (!N8N_BASE_URL) {
    return { status: 'not_configured' as const, url: null, message: 'N8N_WEBHOOK_BASE_URL is not set' };
  }

  try {
    const res = await fetch(`${N8N_BASE_URL}/healthz`, {
      signal: AbortSignal.timeout(5000),
    });
    return {
      status: res.ok ? 'healthy' as const : 'degraded' as const,
      url: N8N_BASE_URL,
      http_status: res.status,
    };
  } catch (err) {
    return {
      status: 'unreachable' as const,
      url: N8N_BASE_URL,
      error: (err as Error).message,
    };
  }
};

// ── Dead-Letter Queue ────────────────────────────────────────────────────────

export const getDeadLetterQueue = async () => {
  const rows = await db
    .select()
    .from(automation_runs)
    .where(
      and(
        eq(automation_runs.status, 'failed'),
        sql`retry_count >= max_retries - 1 AND max_retries > 0`,
      ),
    )
    .orderBy(desc(automation_runs.created_at))
    .limit(100);

  return { total: rows.length, runs: rows };
};

// ── Workflow Registry Seeder ─────────────────────────────────────────────────

export const seedWorkflows = async () => {
  const seeded: typeof workflow_registry.$inferSelect[] = [];

  const releaseExists = await db
    .select({ id: workflow_registry.id })
    .from(workflow_registry)
    .where(eq(workflow_registry.name, 'release-intelligence'))
    .limit(1);

  if (!releaseExists.length) {
    const [wf] = await db
      .insert(workflow_registry)
      .values({
        name: 'release-intelligence',
        description: 'Routes DATIAM Release Intelligence events to n8n handler nodes',
        event_triggers: [
          'release.created',
          'release.updated',
          'release.published',
          'release.campaign.started',
          'release.campaign.completed',
        ],
        webhook_path: '/webhook/release-intelligence',
        is_active: true,
        metadata: { template: 'datiam-release-intelligence-v1' },
      })
      .returning();
    seeded.push(wf);

    logActivity({
      eventType: 'workflow.registered',
      module: 'automation',
      entityType: 'workflow_registry',
      entityId: wf.id,
      title: 'Workflow seeded: release-intelligence',
      severity: 'info',
      metadata: { seeded: true },
    });
  }

  const catalogExists = await db
    .select({ id: workflow_registry.id })
    .from(workflow_registry)
    .where(eq(workflow_registry.name, 'catalog-events'))
    .limit(1);

  if (!catalogExists.length) {
    const [wf] = await db
      .insert(workflow_registry)
      .values({
        name: 'catalog-events',
        description: 'Routes DATIAM Catalog & Artist events to n8n handler nodes',
        event_triggers: [
          'artist.created',
          'artist.updated',
          'song.created',
          'song.updated',
          'catalog.release.created',
          'catalog.release.updated',
          'asset.uploaded',
          'credit.updated',
          'document.uploaded',
        ],
        webhook_path: '/webhook/catalog-events',
        is_active: true,
        metadata: { template: 'datiam-catalog-events-v1' },
      })
      .returning();
    seeded.push(wf);

    logActivity({
      eventType: 'workflow.registered',
      module: 'automation',
      entityType: 'workflow_registry',
      entityId: wf.id,
      title: 'Workflow seeded: catalog-events',
      severity: 'info',
      metadata: { seeded: true },
    });
  }

  // ── Growth OS Workflows ───────────────────────────────────────────────────

  const growthWorkflows: Array<{
    name: string;
    description: string;
    event_triggers: string[];
    webhook_path: string;
    metadata: Record<string, unknown>;
  }> = [
    {
      name: 'growth-publish-post',
      description: 'Publishes scheduled content to social platforms via n8n',
      event_triggers: ['content.publish'],
      webhook_path: '/webhook/publish-post',
      metadata: { template: 'datiam-growth-publish-post-v1', sync: true },
    },
    {
      name: 'growth-analytics-sync',
      description: 'Syncs platform analytics snapshots into DATIAM',
      event_triggers: ['analytics.sync.request'],
      webhook_path: '/webhook/sync-analytics',
      metadata: { template: 'datiam-growth-analytics-sync-v1', sync: true },
    },
    {
      name: 'growth-trend-scan',
      description: 'Scans trend data across social platforms',
      event_triggers: ['trend.scan.request'],
      webhook_path: '/webhook/scan-trends',
      metadata: { template: 'datiam-growth-trend-scan-v1', sync: true },
    },
    {
      name: 'growth-campaign-events',
      description: 'Routes Growth OS campaign lifecycle events',
      event_triggers: ['campaign.created', 'campaign.stage.changed', 'campaign.completed'],
      webhook_path: '/webhook/campaign-events',
      metadata: { template: 'datiam-growth-campaign-events-v1', sync: false },
    },
    {
      name: 'growth-notification-engine',
      description: 'Dispatches Growth OS notifications and alerts',
      event_triggers: ['content.published', 'post.publish.failed', 'analytics.synced', 'trend.detected'],
      webhook_path: '/webhook/notification-engine',
      metadata: { template: 'datiam-growth-notification-engine-v1', sync: false },
    },
  ];

  for (const wfDef of growthWorkflows) {
    const exists = await db
      .select({ id: workflow_registry.id })
      .from(workflow_registry)
      .where(eq(workflow_registry.name, wfDef.name))
      .limit(1);

    if (!exists.length) {
      const [wf] = await db
        .insert(workflow_registry)
        .values({ ...wfDef, is_active: true })
        .returning();
      seeded.push(wf);

      logActivity({
        eventType: 'workflow.registered',
        module: 'automation',
        entityType: 'workflow_registry',
        entityId: wf.id,
        title: `Workflow seeded: ${wfDef.name}`,
        severity: 'info',
        metadata: { seeded: true },
      });
    }
  }

  return {
    seeded: seeded.length,
    message: seeded.length > 0
      ? `Seeded ${seeded.length} workflow(s)`
      : 'All workflows already registered',
    workflows: seeded,
  };
};

// ── Test Event Dispatch ──────────────────────────────────────────────────────

export const testEventDispatch = async (event: string, data: Record<string, unknown> = {}) => {
  const result = await dispatchEvent(event, {
    ...data,
    _test: true,
    _timestamp: new Date().toISOString(),
  });
  return result;
};

// ── Deployment Report ────────────────────────────────────────────────────────

export const getDeploymentReport = async () => {
  const [n8nHealth, stats, dlq, workflows] = await Promise.all([
    checkN8nHealth(),
    getAutomationStats(),
    getDeadLetterQueue(),
    listWorkflows(),
  ]);

  const allEvents = [
    'artist.created', 'artist.updated',
    'song.created', 'song.updated',
    'catalog.release.created', 'catalog.release.updated',
    'asset.uploaded', 'credit.updated', 'document.uploaded',
    'release.created', 'release.updated', 'release.published',
    'release.campaign.started', 'release.campaign.completed',
  ];

  const todos: string[] = [];
  if (!N8N_BASE_URL)  todos.push('Set N8N_WEBHOOK_BASE_URL environment variable');
  if (!N8N_SECRET)    todos.push('Set N8N_WEBHOOK_SECRET environment variable');
  if (dlq.total > 0)  todos.push(`${dlq.total} dead-lettered run(s) require attention`);
  if (!workflows.length) todos.push('Seed workflows via POST /automation/seed');
  if (n8nHealth.status !== 'healthy') todos.push(`n8n instance is ${n8nHealth.status} — start with: docker compose -f n8n/docker-compose.n8n.yml up -d`);

  return {
    generated_at: new Date().toISOString(),
    n8n: {
      status: n8nHealth.status,
      base_url: N8N_BASE_URL || 'NOT_CONFIGURED',
      webhook_secret_configured: !!N8N_SECRET,
    },
    workflows: {
      total: workflows.length,
      active: workflows.filter(w => w.is_active).length,
      inactive: workflows.filter(w => !w.is_active).length,
      registered: workflows.map(w => ({
        name: w.name,
        webhook_path: w.webhook_path,
        event_triggers: w.event_triggers,
        is_active: w.is_active,
        total_runs: w.total_runs,
        success_count: w.success_count,
        failed_count: w.failed_count,
        last_run_at: w.last_run_at,
        last_run_status: w.last_run_status,
      })),
    },
    execution: {
      total_runs:    stats.overview.totalRuns,
      success_count: stats.overview.successCount,
      failed_count:  stats.overview.failedCount,
      success_rate:  stats.overview.successRate,
      queue_health:  stats.overview.queueHealth,
    },
    dead_letter_queue: {
      total:    dlq.total,
      oldest_at: dlq.runs[dlq.runs.length - 1]?.created_at ?? null,
    },
    environment: {
      N8N_WEBHOOK_BASE_URL: N8N_BASE_URL ? 'SET' : 'NOT_SET',
      N8N_WEBHOOK_SECRET:   N8N_SECRET   ? 'SET' : 'NOT_SET',
    },
    registered_events: allEvents,
    retry_config: {
      max_retries:      3,
      backoff_strategy: 'linear (1s × attempt)',
      timeout_ms:       TRIGGER_TIMEOUT,
    },
    webhook_urls: workflows.map(w => ({
      workflow:    w.name,
      webhook_url: N8N_BASE_URL ? `${N8N_BASE_URL}${w.webhook_path}` : `<N8N_WEBHOOK_BASE_URL>${w.webhook_path}`,
    })),
    todos,
  };
};

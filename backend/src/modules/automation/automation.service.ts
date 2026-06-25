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
    'release.created',
    'release.updated',
    'release.published',
    'release.campaign.started',
    'release.campaign.completed',
  ],
});

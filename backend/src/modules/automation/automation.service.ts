import { eq } from 'drizzle-orm';
import { desc } from 'drizzle-orm';
import { db } from '../../db';
import { automation_runs } from '../../db/schema';
import { AppError } from '../../middleware/errorHandler';
import { logActivity } from '../../lib/activityLogger';
import type { WebhookInput, CreateRunInput, UpdateRunInput } from './automation.schema';

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
    description: `Webhook received for workflow "${input.workflow_name}" from ${input.source ?? 'n8n'}`,
    severity: 'info',
    metadata: { source: input.source ?? 'n8n', runId: run.id, workflowName: input.workflow_name },
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
    description: `Workflow "${input.workflow_name}" finished successfully`,
    severity: 'info',
    metadata: { source: input.source ?? 'n8n', runId: run.id, workflowName: input.workflow_name },
  });

  return { run_id: run.id, workflow: input.workflow_name, status: 'success' };
};

export const getAutomationRuns = async () => {
  return db
    .select()
    .from(automation_runs)
    .orderBy(desc(automation_runs.created_at))
    .limit(50);
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
  const isCompleted = input.status === 'success';

  logActivity({
    eventType: isFailed ? 'automation_run.failed' : isCompleted ? 'automation_run.completed' : 'automation_run.logged',
    module: 'automation',
    entityType: 'automation_run',
    entityId: run.id,
    title: isFailed
      ? `Automation failed: ${input.workflow_name}`
      : isCompleted
        ? `Automation completed: ${input.workflow_name}`
        : `Automation run logged: ${input.workflow_name}`,
    description: `Workflow "${input.workflow_name}" run recorded with status: ${input.status}`,
    severity: isFailed ? 'error' : 'info',
    metadata: { source: input.source, runId: run.id, status: input.status },
  });

  return run;
};

export const updateAutomationRun = async (id: string, input: UpdateRunInput) => {
  const [existing] = await db
    .select()
    .from(automation_runs)
    .where(eq(automation_runs.id, id))
    .limit(1);

  if (!existing) throw new AppError('Automation run not found', 404);

  const [run] = await db
    .update(automation_runs)
    .set({
      status: input.status,
      ...(input.result ? { result: input.result } : {}),
    })
    .where(eq(automation_runs.id, id))
    .returning();

  return run;
};

export const deleteAutomationRun = async (id: string) => {
  const [deleted] = await db.delete(automation_runs).where(eq(automation_runs.id, id)).returning();
  if (!deleted) throw new AppError('Automation run not found', 404);
  return { deleted: true, id, workflow_name: deleted.workflow_name };
};

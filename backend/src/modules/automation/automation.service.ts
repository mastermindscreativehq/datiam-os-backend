import { eq } from 'drizzle-orm';
import { desc } from 'drizzle-orm';
import { db } from '../../db';
import { automation_runs } from '../../db/schema';
import { AppError } from '../../middleware/errorHandler';
import { logActivity } from '../../lib/activityLogger';
import type { WebhookInput, CreateRunInput } from './automation.schema';

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
    eventType: 'automation.run.started',
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
  logActivity({
    eventType: isFailed ? 'automation.run.failed' : 'automation.run.started',
    module: 'automation',
    entityType: 'automation_run',
    entityId: run.id,
    title: isFailed
      ? `Automation failed: ${input.workflow_name}`
      : `Automation run logged: ${input.workflow_name}`,
    severity: isFailed ? 'error' : 'info',
    metadata: { source: input.source, runId: run.id, status: input.status },
  });

  return run;
};

export const deleteAutomationRun = async (id: string) => {
  const [deleted] = await db.delete(automation_runs).where(eq(automation_runs.id, id)).returning();
  if (!deleted) throw new AppError('Automation run not found', 404);
  return { deleted: true, id };
};

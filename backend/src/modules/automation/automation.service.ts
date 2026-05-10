import { eq } from 'drizzle-orm';
import { desc } from 'drizzle-orm';
import { db } from '../../db';
import { automation_runs } from '../../db/schema';
import { AppError } from '../../middleware/errorHandler';
import type { WebhookInput } from './automation.schema';

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

import { Request, Response, NextFunction } from 'express';
import * as automationService from './automation.service';
import { logActivity } from '../../lib/activityLogger';
import { success } from '../../utils/response';

// ── Inbound webhook ─────────────────────────────────────────────────────────

export const receiveWebhook = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const secret = (req.headers['x-webhook-secret'] ?? req.headers['x-datiam-secret']) as string | undefined;
    const result = await automationService.receiveWebhook(req.body, secret);
    success(res, result, 201);
  } catch (err) { next(err); }
};

// ── Automation Runs ─────────────────────────────────────────────────────────

export const getAutomationRuns = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
  try { success(res, await automationService.getAutomationRuns()); }
  catch (err) { next(err); }
};

export const getRunHistory = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try { success(res, await automationService.getRunHistory(req.query as any)); }
  catch (err) { next(err); }
};

export const createAutomationRun = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try { success(res, await automationService.createAutomationRun(req.body), 201); }
  catch (err) { next(err); }
};

export const updateAutomationRun = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const run = await automationService.updateAutomationRun(req.params.id, req.body);
    const isFailed = run.status === 'failed';
    logActivity({
      userId: req.user?.id,
      userEmail: req.user?.email,
      eventType: isFailed ? 'automation_run.failed' : 'automation_run.updated',
      module: 'automation',
      entityType: 'automation_run',
      entityId: run.id,
      title: isFailed ? `Automation failed: ${run.workflow_name}` : `Automation run updated: ${run.workflow_name}`,
      severity: isFailed ? 'error' : 'info',
      requestId: req.requestId,
      metadata: { runId: run.id, status: run.status },
    });
    success(res, run);
  } catch (err) { next(err); }
};

export const deleteAutomationRun = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const result = await automationService.deleteAutomationRun(req.params.id);
    logActivity({
      userId: req.user?.id,
      userEmail: req.user?.email,
      eventType: 'automation_run.deleted',
      module: 'automation',
      entityType: 'automation_run',
      entityId: req.params.id,
      title: `Automation run deleted: ${result.workflow_name}`,
      severity: 'warning',
      requestId: req.requestId,
      metadata: { runId: req.params.id, workflowName: result.workflow_name },
    });
    success(res, { deleted: true, id: result.id });
  } catch (err) { next(err); }
};

export const retryRun = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try { success(res, await automationService.retryRun(req.params.id)); }
  catch (err) { next(err); }
};

// ── Workflow Registry ───────────────────────────────────────────────────────

export const listWorkflows = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
  try { success(res, await automationService.listWorkflows()); }
  catch (err) { next(err); }
};

export const getWorkflowById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try { success(res, await automationService.getWorkflowById(req.params.id)); }
  catch (err) { next(err); }
};

export const createWorkflow = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try { success(res, await automationService.createWorkflow(req.body), 201); }
  catch (err) { next(err); }
};

export const updateWorkflow = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try { success(res, await automationService.updateWorkflow(req.params.id, req.body)); }
  catch (err) { next(err); }
};

export const deleteWorkflow = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const result = await automationService.deleteWorkflow(req.params.id);
    success(res, { deleted: true, id: result.id, name: result.name });
  } catch (err) { next(err); }
};

export const triggerWorkflow = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try { success(res, await automationService.triggerWorkflow(req.params.id, req.body), 202); }
  catch (err) { next(err); }
};

// ── Stats & Events ──────────────────────────────────────────────────────────

export const getAutomationStats = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
  try { success(res, await automationService.getAutomationStats()); }
  catch (err) { next(err); }
};

export const getEventTypes = (_req: Request, res: Response, next: NextFunction): void => {
  try { success(res, automationService.getEventTypes()); }
  catch (err) { next(err); }
};

export const dispatchEvent = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try { success(res, await automationService.dispatchEvent(req.body.event, req.body.data ?? {}), 202); }
  catch (err) { next(err); }
};

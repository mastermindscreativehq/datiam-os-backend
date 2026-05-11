import { Request, Response, NextFunction } from 'express';
import * as automationService from './automation.service';
import { logActivity } from '../../lib/activityLogger';
import { success } from '../../utils/response';

export const receiveWebhook = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const secret = req.headers['x-webhook-secret'] as string | undefined;
    const result = await automationService.receiveWebhook(req.body, secret);
    success(res, result, 201);
  } catch (err) {
    next(err);
  }
};

export const getAutomationRuns = async (
  _req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    success(res, await automationService.getAutomationRuns());
  } catch (err) {
    next(err);
  }
};

export const createAutomationRun = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    success(res, await automationService.createAutomationRun(req.body), 201);
  } catch (err) {
    next(err);
  }
};

export const updateAutomationRun = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const run = await automationService.updateAutomationRun(req.params.id, req.body);
    const isFailed = run.status === 'failed';
    const isCompleted = run.status === 'success';

    logActivity({
      userId: req.user?.id,
      userEmail: req.user?.email,
      eventType: isFailed ? 'automation_run.failed' : isCompleted ? 'automation_run.completed' : 'automation_run.updated',
      module: 'automation',
      entityType: 'automation_run',
      entityId: run.id,
      title: isFailed
        ? `Automation failed: ${run.workflow_name}`
        : isCompleted
          ? `Automation completed: ${run.workflow_name}`
          : `Automation run updated: ${run.workflow_name}`,
      description: `Run "${run.workflow_name}" status changed to ${run.status}`,
      severity: isFailed ? 'error' : 'info',
      requestId: req.requestId,
      metadata: { runId: run.id, workflowName: run.workflow_name, status: run.status },
    });
    success(res, run);
  } catch (err) {
    next(err);
  }
};

export const deleteAutomationRun = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
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
      description: `Removed automation run record for "${result.workflow_name}"`,
      severity: 'warning',
      requestId: req.requestId,
      metadata: { runId: req.params.id, workflowName: result.workflow_name },
    });
    success(res, { deleted: true, id: result.id });
  } catch (err) {
    next(err);
  }
};

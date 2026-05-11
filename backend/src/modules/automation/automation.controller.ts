import { Request, Response, NextFunction } from 'express';
import * as automationService from './automation.service';
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

export const deleteAutomationRun = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    success(res, await automationService.deleteAutomationRun(req.params.id));
  } catch (err) {
    next(err);
  }
};

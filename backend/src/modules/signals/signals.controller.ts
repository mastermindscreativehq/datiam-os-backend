import { Request, Response, NextFunction } from 'express';
import * as svc from './signals.service';
import { success } from '../../utils/response';

export const getSummary = async (_req: Request, res: Response, next: NextFunction) => {
  try {
    success(res, await svc.getSignalsSummary());
  } catch (err) {
    next(err);
  }
};

export const getFunnel = async (_req: Request, res: Response, next: NextFunction) => {
  try {
    success(res, await svc.getPipelineFunnel());
  } catch (err) {
    next(err);
  }
};

export const getByPlatform = async (_req: Request, res: Response, next: NextFunction) => {
  try {
    success(res, await svc.getContentByPlatform());
  } catch (err) {
    next(err);
  }
};

export const getByType = async (_req: Request, res: Response, next: NextFunction) => {
  try {
    success(res, await svc.getContentByType());
  } catch (err) {
    next(err);
  }
};

export const getVelocity = async (_req: Request, res: Response, next: NextFunction) => {
  try {
    success(res, await svc.getPublishingVelocity());
  } catch (err) {
    next(err);
  }
};

export const getScheduled = async (_req: Request, res: Response, next: NextFunction) => {
  try {
    success(res, await svc.getScheduledContent());
  } catch (err) {
    next(err);
  }
};

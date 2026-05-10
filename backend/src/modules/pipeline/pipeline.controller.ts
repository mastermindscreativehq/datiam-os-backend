import { Request, Response, NextFunction } from 'express';
import * as svc from './pipeline.service';
import { success } from '../../utils/response';

export const getOverview = async (_req: Request, res: Response, next: NextFunction) => {
  try {
    success(res, await svc.getPipelineOverview());
  } catch (err) {
    next(err);
  }
};

export const getReleaseReadiness = async (req: Request, res: Response, next: NextFunction) => {
  try {
    success(res, await svc.getReleaseReadiness(req.params.id));
  } catch (err) {
    next(err);
  }
};

export const getTimeline = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const days = Math.min(parseInt(req.query.days as string) || 90, 365);
    success(res, await svc.getUpcomingTimeline(days));
  } catch (err) {
    next(err);
  }
};

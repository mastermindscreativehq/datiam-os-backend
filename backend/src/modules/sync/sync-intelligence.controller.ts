import { Request, Response, NextFunction } from 'express';
import { getSyncPipelineAnalytics } from './sync-intelligence.service';
import { success } from '../../utils/response';

export const getPipelineAnalytics = async (_req: Request, res: Response, next: NextFunction) => {
  try {
    success(res, await getSyncPipelineAnalytics());
  } catch (err) {
    next(err);
  }
};

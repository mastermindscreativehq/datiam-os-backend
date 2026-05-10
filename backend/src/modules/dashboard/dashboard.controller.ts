import { Request, Response, NextFunction } from 'express';
import * as dashboardService from './dashboard.service';
import { success } from '../../utils/response';

export const getOverview = async (
  _req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    success(res, await dashboardService.getDashboardOverview());
  } catch (err) {
    next(err);
  }
};

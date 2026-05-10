import { Request, Response, NextFunction } from 'express';
import * as fansService from './fans.service';
import { success } from '../../utils/response';

export const createFan = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try { success(res, await fansService.createFan(req.body), 201); }
  catch (err) { next(err); }
};

export const getFans = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
  try { success(res, await fansService.getFans()); }
  catch (err) { next(err); }
};

export const getFanById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try { success(res, await fansService.getFanById(req.params.id)); }
  catch (err) { next(err); }
};

export const createFanEvent = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try { success(res, await fansService.createFanEvent(req.params.id, req.body), 201); }
  catch (err) { next(err); }
};

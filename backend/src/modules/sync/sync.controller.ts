import { Request, Response, NextFunction } from 'express';
import * as syncService from './sync.service';
import { success } from '../../utils/response';

export const createSyncPitch = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try { success(res, await syncService.createSyncPitch(req.body), 201); }
  catch (err) { next(err); }
};

export const getSyncPitches = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
  try { success(res, await syncService.getSyncPitches()); }
  catch (err) { next(err); }
};

export const updateSyncPitch = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try { success(res, await syncService.updateSyncPitch(req.params.id, req.body)); }
  catch (err) { next(err); }
};

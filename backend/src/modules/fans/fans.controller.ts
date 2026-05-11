import { Request, Response, NextFunction } from 'express';
import * as fansService from './fans.service';
import { logActivity } from '../activity/activity.service';
import { success } from '../../utils/response';

export const createFan = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const fan = await fansService.createFan(req.body);
    logActivity({ userId: req.user!.id, userEmail: req.user!.email, action: 'CREATE', entityType: 'fan_profile', entityId: fan.id, entityName: fan.name });
    success(res, fan, 201);
  } catch (err) { next(err); }
};

export const getFans = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
  try { success(res, await fansService.getFans()); }
  catch (err) { next(err); }
};

export const getFanById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try { success(res, await fansService.getFanById(req.params.id)); }
  catch (err) { next(err); }
};

export const updateFan = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const fan = await fansService.updateFan(req.params.id, req.body);
    logActivity({ userId: req.user!.id, userEmail: req.user!.email, action: 'UPDATE', entityType: 'fan_profile', entityId: fan.id, entityName: fan.name });
    success(res, fan);
  } catch (err) { next(err); }
};

export const deleteFan = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const result = await fansService.deleteFan(req.params.id);
    logActivity({ userId: req.user!.id, userEmail: req.user!.email, action: 'DELETE', entityType: 'fan_profile', entityId: req.params.id });
    success(res, result);
  } catch (err) { next(err); }
};

export const createFanEvent = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try { success(res, await fansService.createFanEvent(req.params.id, req.body), 201); }
  catch (err) { next(err); }
};

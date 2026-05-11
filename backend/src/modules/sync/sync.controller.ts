import { Request, Response, NextFunction } from 'express';
import * as syncService from './sync.service';
import { logActivity } from '../activity/activity.service';
import { success } from '../../utils/response';

export const createSyncPitch = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const pitch = await syncService.createSyncPitch(req.body);
    logActivity({ userId: req.user!.id, userEmail: req.user!.email, action: 'CREATE', entityType: 'sync_pitch', entityId: pitch.id, entityName: pitch.pitch_target });
    success(res, pitch, 201);
  } catch (err) { next(err); }
};

export const getSyncPitches = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
  try { success(res, await syncService.getSyncPitches()); }
  catch (err) { next(err); }
};

export const updateSyncPitch = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const pitch = await syncService.updateSyncPitch(req.params.id, req.body);
    logActivity({ userId: req.user!.id, userEmail: req.user!.email, action: 'UPDATE', entityType: 'sync_pitch', entityId: pitch.id, entityName: pitch.pitch_target });
    success(res, pitch);
  } catch (err) { next(err); }
};

export const deleteSyncPitch = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const result = await syncService.deleteSyncPitch(req.params.id);
    logActivity({ userId: req.user!.id, userEmail: req.user!.email, action: 'DELETE', entityType: 'sync_pitch', entityId: req.params.id });
    success(res, result);
  } catch (err) { next(err); }
};

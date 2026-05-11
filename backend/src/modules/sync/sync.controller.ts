import { Request, Response, NextFunction } from 'express';
import * as syncService from './sync.service';
import { logActivity } from '../../lib/activityLogger';
import { success } from '../../utils/response';

export const createSyncPitch = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const pitch = await syncService.createSyncPitch(req.body);
    logActivity({
      userId: req.user?.id,
      userEmail: req.user?.email,
      eventType: 'sync_pitch.created',
      module: 'sync',
      entityType: 'sync_pitch',
      entityId: pitch.id,
      title: `Sync pitch created: ${pitch.pitch_target}`,
      description: `New sync pitch targeting "${pitch.pitch_target}"`,
      severity: 'info',
      requestId: req.requestId,
      metadata: { pitchId: pitch.id, target: pitch.pitch_target },
    });
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
    logActivity({
      userId: req.user?.id,
      userEmail: req.user?.email,
      eventType: 'sync_pitch.updated',
      module: 'sync',
      entityType: 'sync_pitch',
      entityId: pitch.id,
      title: `Sync pitch updated: ${pitch.pitch_target}`,
      description: `Updated sync pitch for "${pitch.pitch_target}"`,
      severity: 'info',
      requestId: req.requestId,
      metadata: { pitchId: pitch.id, target: pitch.pitch_target },
    });
    success(res, pitch);
  } catch (err) { next(err); }
};

export const deleteSyncPitch = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const result = await syncService.deleteSyncPitch(req.params.id);
    logActivity({
      userId: req.user?.id,
      userEmail: req.user?.email,
      eventType: 'sync_pitch.deleted',
      module: 'sync',
      entityType: 'sync_pitch',
      entityId: req.params.id,
      title: `Sync pitch deleted`,
      description: `Removed sync pitch ${req.params.id}`,
      severity: 'warning',
      requestId: req.requestId,
      metadata: { pitchId: req.params.id },
    });
    success(res, result);
  } catch (err) { next(err); }
};

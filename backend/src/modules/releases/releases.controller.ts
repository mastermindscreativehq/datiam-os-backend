import { Request, Response, NextFunction } from 'express';
import * as releasesService from './releases.service';
import { logActivity } from '../activity/activity.service';
import { success } from '../../utils/response';

export const createRelease = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const release = await releasesService.createRelease(req.body);
    logActivity({ userId: req.user!.id, userEmail: req.user!.email, action: 'CREATE', entityType: 'release', entityId: release.id, entityName: release.release_title });
    success(res, release, 201);
  } catch (err) { next(err); }
};

export const getReleases = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
  try { success(res, await releasesService.getReleases()); }
  catch (err) { next(err); }
};

export const getReleaseById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try { success(res, await releasesService.getReleaseById(req.params.id)); }
  catch (err) { next(err); }
};

export const updateRelease = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const release = await releasesService.updateRelease(req.params.id, req.body);
    logActivity({ userId: req.user!.id, userEmail: req.user!.email, action: 'UPDATE', entityType: 'release', entityId: release.id, entityName: release.release_title });
    success(res, release);
  } catch (err) { next(err); }
};

export const deleteRelease = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const result = await releasesService.deleteRelease(req.params.id);
    logActivity({ userId: req.user!.id, userEmail: req.user!.email, action: 'DELETE', entityType: 'release', entityId: req.params.id });
    success(res, result);
  } catch (err) { next(err); }
};

export const createReleaseTask = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try { success(res, await releasesService.createReleaseTask(req.params.id, req.body), 201); }
  catch (err) { next(err); }
};

export const getReleaseTasks = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try { success(res, await releasesService.getReleaseTasks(req.params.id)); }
  catch (err) { next(err); }
};

export const updateReleaseTask = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try { success(res, await releasesService.updateReleaseTask(req.params.id, req.body)); }
  catch (err) { next(err); }
};

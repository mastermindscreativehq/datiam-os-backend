import { Request, Response, NextFunction } from 'express';
import * as releasesService from './releases.service';
import { logActivity } from '../../lib/activityLogger';
import { success } from '../../utils/response';

export const createRelease = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const release = await releasesService.createRelease(req.body);
    logActivity({
      userId: req.user?.id,
      userEmail: req.user?.email,
      eventType: 'release.created',
      module: 'releases',
      entityType: 'release',
      entityId: release.id,
      title: `Release created: ${release.release_title}`,
      description: `New release "${release.release_title}" added`,
      severity: 'info',
      requestId: req.requestId,
      metadata: { releaseId: release.id, title: release.release_title },
    });
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
    logActivity({
      userId: req.user?.id,
      userEmail: req.user?.email,
      eventType: 'release.updated',
      module: 'releases',
      entityType: 'release',
      entityId: release.id,
      title: `Release updated: ${release.release_title}`,
      description: `Updated release "${release.release_title}"`,
      severity: 'info',
      requestId: req.requestId,
      metadata: { releaseId: release.id, title: release.release_title },
    });
    success(res, release);
  } catch (err) { next(err); }
};

export const deleteRelease = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const result = await releasesService.deleteRelease(req.params.id);
    logActivity({
      userId: req.user?.id,
      userEmail: req.user?.email,
      eventType: 'release.deleted',
      module: 'releases',
      entityType: 'release',
      entityId: req.params.id,
      title: `Release deleted`,
      description: `Removed release ${req.params.id}`,
      severity: 'warning',
      requestId: req.requestId,
      metadata: { releaseId: req.params.id },
    });
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

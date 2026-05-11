import { Request, Response, NextFunction } from 'express';
import * as artistsService from './artists.service';
import { success } from '../../utils/response';
import { logActivity } from '../../lib/activityLogger';

export const listArtists = async (
  _req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    success(res, await artistsService.listArtists());
  } catch (err) {
    next(err);
  }
};

export const createProfile = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const profile = await artistsService.createProfile(req.body);
    logActivity({
      userId: req.user?.id,
      eventType: 'artist.created',
      module: 'artists',
      entityType: 'artist_profile',
      entityId: profile.id,
      title: `Artist created: ${profile.stage_name}`,
      severity: 'info',
      metadata: { requestId: req.requestId },
    });
    success(res, profile, 201);
  } catch (err) {
    next(err);
  }
};

export const updateProfile = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const profile = await artistsService.updateProfile(req.params.id, req.body);
    logActivity({
      userId: req.user?.id,
      eventType: 'artist.updated',
      module: 'artists',
      entityType: 'artist_profile',
      entityId: profile.id,
      title: `Artist updated: ${profile.stage_name}`,
      severity: 'info',
      metadata: { requestId: req.requestId },
    });
    success(res, profile);
  } catch (err) {
    next(err);
  }
};

export const deleteProfile = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const profile = await artistsService.deleteProfile(req.params.id);
    logActivity({
      userId: req.user?.id,
      eventType: 'artist.deleted',
      module: 'artists',
      entityType: 'artist_profile',
      entityId: profile.id,
      title: `Artist deleted: ${profile.stage_name}`,
      severity: 'warning',
      metadata: { requestId: req.requestId },
    });
    success(res, profile);
  } catch (err) {
    next(err);
  }
};

import { Request, Response, NextFunction } from 'express';
import * as svc from './music-intelligence.service';
import { success } from '../../utils/response';
import { AppError } from '../../middleware/errorHandler';
import type { CreateSessionInput, UpdateSessionInput } from './music-intelligence.schema';

export const createSession = async (req: Request, res: Response, next: NextFunction) => {
  try {
    success(res, await svc.createSession(
      req.body as CreateSessionInput,
      req.user?.email,
    ), 201);
  } catch (err) { next(err); }
};

export const listSessions = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const artistId = req.query.artist_id as string | undefined;
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);
    success(res, await svc.listSessions(artistId, limit));
  } catch (err) { next(err); }
};

export const getSession = async (req: Request, res: Response, next: NextFunction) => {
  try {
    success(res, await svc.getSession(req.params.id));
  } catch (err) { next(err); }
};

export const regenerateBlueprint = async (req: Request, res: Response, next: NextFunction) => {
  try {
    success(res, await svc.regenerateBlueprint(req.params.id), 201);
  } catch (err) { next(err); }
};

export const updateSession = async (req: Request, res: Response, next: NextFunction) => {
  try {
    success(res, await svc.updateSession(req.params.id, req.body as UpdateSessionInput));
  } catch (err) { next(err); }
};

export const deleteSession = async (req: Request, res: Response, next: NextFunction) => {
  try {
    success(res, await svc.deleteSession(req.params.id));
  } catch (err) { next(err); }
};

export const getArtistMemory = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const artistId = req.query.artist_id as string | undefined;
    if (!artistId) return next(new AppError('artist_id query param is required', 400));
    success(res, await svc.getArtistMemory(artistId));
  } catch (err) { next(err); }
};

export const getDashboard = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const artistId = req.query.artist_id as string | undefined;
    success(res, await svc.getDashboard(artistId));
  } catch (err) { next(err); }
};

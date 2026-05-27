import { Request, Response, NextFunction } from 'express';
import * as svc from './sonic-world.service';
import { success } from '../../utils/response';
import { AppError } from '../../middleware/errorHandler';
import type { GenerateBlueprintInput } from './sonic-world.schema';

export const generateBlueprint = async (req: Request, res: Response, next: NextFunction) => {
  try {
    success(res, await svc.generateBlueprint(req.body as GenerateBlueprintInput, req.user?.email), 201);
  } catch (err) { next(err); }
};

export const getLatestBlueprint = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const blueprint = await svc.getLatestBlueprint(req.params.sessionId);
    if (!blueprint) return next(new AppError('No Sonic World blueprint found for this session', 404));
    success(res, blueprint);
  } catch (err) { next(err); }
};

export const getBlueprintHistory = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 50);
    success(res, await svc.getBlueprintHistory(req.params.sessionId, limit));
  } catch (err) { next(err); }
};

export const getDashboard = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const artistId = req.query.artist_id as string | undefined;
    success(res, await svc.getDashboard(artistId));
  } catch (err) { next(err); }
};

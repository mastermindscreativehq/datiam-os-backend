import { Request, Response, NextFunction } from 'express';
import { analyticsHubService } from './analytics-hub.service';
import { success } from '../../utils/response';

export const ingestSnapshot = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const row = await analyticsHubService.ingestSnapshot(req.body);
    success(res, row, 201);
  } catch (err) { next(err); }
};

export const ingestPostAnalytics = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const row = await analyticsHubService.ingestPostAnalytics(req.body);
    success(res, row, 201);
  } catch (err) { next(err); }
};

export const ingestPlatformMetrics = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const row = await analyticsHubService.ingestPlatformMetrics(req.body);
    success(res, row, 201);
  } catch (err) { next(err); }
};

export const getOverview = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { artist_id, days } = req.query as any;
    success(res, await analyticsHubService.getOverview(artist_id, days ? Number(days) : undefined));
  } catch (err) { next(err); }
};

export const getByPlatform = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { artist_id, days } = req.query as any;
    success(res, await analyticsHubService.getByPlatform(artist_id, days ? Number(days) : undefined));
  } catch (err) { next(err); }
};

export const getTopContent = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { artist_id, limit } = req.query as any;
    success(res, await analyticsHubService.getTopContent(artist_id, limit ? Number(limit) : undefined));
  } catch (err) { next(err); }
};

export const getAccountSnapshots = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { days } = req.query as any;
    success(res, await analyticsHubService.getSnapshots(req.params.accountId, days ? Number(days) : undefined));
  } catch (err) { next(err); }
};

export const getPlatformMetrics = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { artist_id, platform_id, song_id } = req.query as any;
    success(res, await analyticsHubService.getPlatformMetrics(artist_id, platform_id, song_id));
  } catch (err) { next(err); }
};

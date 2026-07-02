import { Request, Response, NextFunction } from 'express';
import { trendIntelligenceService } from './trend-intelligence.service';
import { logActivity } from '../activity/activity.service';
import { success } from '../../utils/response';

export const createTrend = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const row = await trendIntelligenceService.create(req.body);
    logActivity({ userId: req.user!.id, userEmail: req.user!.email, action: 'CREATE', entityType: 'trend_report', entityId: row.id, entityName: row.title });
    success(res, row, 201);
  } catch (err) { next(err); }
};

export const listTrends = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try { success(res, await trendIntelligenceService.list(req.query as any)); }
  catch (err) { next(err); }
};

export const getActiveTrends = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { platform_id, category } = req.query as any;
    success(res, await trendIntelligenceService.getActiveTrends(platform_id, category));
  } catch (err) { next(err); }
};

export const getTrend = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try { success(res, await trendIntelligenceService.getById(req.params.id)); }
  catch (err) { next(err); }
};

export const updateTrend = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const row = await trendIntelligenceService.update(req.params.id, req.body);
    success(res, row);
  } catch (err) { next(err); }
};

export const expireTrend = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const row = await trendIntelligenceService.expireTrend(req.params.id);
    success(res, row);
  } catch (err) { next(err); }
};

export const archiveTrend = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const row = await trendIntelligenceService.archiveTrend(req.params.id);
    success(res, row);
  } catch (err) { next(err); }
};

export const createRecommendation = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const row = await trendIntelligenceService.createRecommendation(
      req.params.id,
      req.body.content_id ?? null,
      req.body.artist_id ?? null,
      req.body.suggestion,
      req.body.relevance_score,
    );
    success(res, row, 201);
  } catch (err) { next(err); }
};

export const getRecommendations = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try { success(res, await trendIntelligenceService.getRecommendations(req.params.id)); }
  catch (err) { next(err); }
};

export const getArtistRecommendations = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try { success(res, await trendIntelligenceService.getRecommendationsForArtist(req.params.artistId)); }
  catch (err) { next(err); }
};

export const markRecommendationActedOn = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try { success(res, await trendIntelligenceService.markRecommendationActedOn(req.params.recId)); }
  catch (err) { next(err); }
};

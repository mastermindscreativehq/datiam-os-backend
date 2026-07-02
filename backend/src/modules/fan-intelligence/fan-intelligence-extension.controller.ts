import { Request, Response, NextFunction } from 'express';
import { fanIntelligenceExtensionService } from './fan-intelligence-extension.service';
import { success } from '../../utils/response';

export const getTopAmbassadors = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { limit } = req.query as any;
    success(res, await fanIntelligenceExtensionService.getTopAmbassadors(limit ? Number(limit) : undefined));
  } catch (err) { next(err); }
};

export const getAmbassadorCandidates = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { min_score, limit } = req.query as any;
    success(res, await fanIntelligenceExtensionService.getAmbassadorCandidates(
      min_score ? Number(min_score) : undefined,
      limit ? Number(limit) : undefined,
    ));
  } catch (err) { next(err); }
};

export const batchRecalculate = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
  try { success(res, await fanIntelligenceExtensionService.batchRecalculateAmbassadorScores()); }
  catch (err) { next(err); }
};

export const recalculateSingle = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try { success(res, await fanIntelligenceExtensionService.recalculateAmbassadorScore(req.params.fanId)); }
  catch (err) { next(err); }
};

export const getReferralActivity = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
  try { success(res, await fanIntelligenceExtensionService.getReferralActivity()); }
  catch (err) { next(err); }
};

export const getCommunityMetrics = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
  try { success(res, await fanIntelligenceExtensionService.getCommunityMetrics()); }
  catch (err) { next(err); }
};

export const getFavoriteContent = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try { success(res, await fanIntelligenceExtensionService.getFanFavoriteContent(req.params.fanId)); }
  catch (err) { next(err); }
};

import { Request, Response, NextFunction } from 'express';
import * as svc from './fan-intelligence.service';
import { success } from '../../utils/response';

export const getSummary = async (_req: Request, res: Response, next: NextFunction) => {
  try {
    success(res, await svc.getIntelligenceSummary());
  } catch (err) {
    next(err);
  }
};

export const getSegments = async (_req: Request, res: Response, next: NextFunction) => {
  try {
    success(res, await svc.getFanSegments());
  } catch (err) {
    next(err);
  }
};

export const getTopFans = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
    success(res, await svc.getTopFans(limit));
  } catch (err) {
    next(err);
  }
};

export const getEngagement = async (_req: Request, res: Response, next: NextFunction) => {
  try {
    success(res, await svc.getEngagementBreakdown());
  } catch (err) {
    next(err);
  }
};

export const getGeography = async (_req: Request, res: Response, next: NextFunction) => {
  try {
    success(res, await svc.getGeographicDistribution());
  } catch (err) {
    next(err);
  }
};

export const getSources = async (_req: Request, res: Response, next: NextFunction) => {
  try {
    success(res, await svc.getSourceBreakdown());
  } catch (err) {
    next(err);
  }
};

export const getGrowth = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const days = Math.min(parseInt(req.query.days as string) || 30, 365);
    success(res, await svc.getFanGrowth(days));
  } catch (err) {
    next(err);
  }
};

export const getFanTimeline = async (req: Request, res: Response, next: NextFunction) => {
  try {
    success(res, await svc.getFanTimeline(req.params.id));
  } catch (err) {
    next(err);
  }
};

export const recalculateFanScore = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const score = await svc.recalculateFanScore(req.params.id);
    success(res, { fan_id: req.params.id, score });
  } catch (err) {
    next(err);
  }
};

export const updateFanScore = async (req: Request, res: Response, next: NextFunction) => {
  try {
    success(res, await svc.updateFanScore(req.params.id, req.body.score));
  } catch (err) {
    next(err);
  }
};

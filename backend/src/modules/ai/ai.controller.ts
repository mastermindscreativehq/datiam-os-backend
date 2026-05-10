import { Request, Response, NextFunction } from 'express';
import * as svc from './ai.service';
import { success } from '../../utils/response';

export const generateRecommendation = async (req: Request, res: Response, next: NextFunction) => {
  try {
    success(res, await svc.generateRecommendation(req.body), 201);
  } catch (err) {
    next(err);
  }
};

export const listRecommendations = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
    success(res, await svc.listRecommendations(limit));
  } catch (err) {
    next(err);
  }
};

export const acceptRecommendation = async (req: Request, res: Response, next: NextFunction) => {
  try {
    success(res, await svc.acceptRecommendation(req.params.id));
  } catch (err) {
    next(err);
  }
};

export const dismissRecommendation = async (req: Request, res: Response, next: NextFunction) => {
  try {
    success(res, await svc.dismissRecommendation(req.params.id));
  } catch (err) {
    next(err);
  }
};

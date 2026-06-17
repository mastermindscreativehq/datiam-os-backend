import { Request, Response, NextFunction } from 'express';
import { analyzeOpportunity } from './intelligence.service';
import { success } from '../../utils/response';
import type { AnalyzeOpportunityInput } from './intelligence.schema';

export const analyzeOpportunityHandler = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const result = await analyzeOpportunity(req.body as AnalyzeOpportunityInput);
    success(res, result, 201);
  } catch (err) {
    next(err);
  }
};

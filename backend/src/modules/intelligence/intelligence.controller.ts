import { Request, Response, NextFunction } from 'express';
import { analyzeOpportunity } from './intelligence.service';
import { resolveOutcome, getModelPerformance } from './outcome-resolution.service';
import { getAdaptiveWeights, recalculateWeights } from './adaptive-weights.service';
import { discoverOpportunities } from './opportunity-discovery.service';
import { success } from '../../utils/response';
import { logActivity } from '../../lib/activityLogger';
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

export const resolveOutcomeHandler = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const entry = await resolveOutcome(req.body);
    logActivity({
      userId:     req.user?.id,
      userEmail:  req.user?.email,
      eventType:  'outcome_resolved',
      module:     'intelligence',
      entityType: 'prediction_accuracy_log',
      entityId:   entry.id,
      title:      `Outcome resolved: ${entry.actual_label} — accuracy ${entry.accuracy_score}`,
    });
    success(res, entry);
  } catch (err) {
    next(err);
  }
};

export const modelPerformanceHandler = async (
  _req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const performance = await getModelPerformance();
    success(res, performance);
  } catch (err) {
    next(err);
  }
};

export const adaptiveWeightsHandler = async (
  _req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const weights = await getAdaptiveWeights();
    success(res, { adaptive_weights: weights, count: weights.length });
  } catch (err) {
    next(err);
  }
};

export const discoverOpportunitiesHandler = async (
  _req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const result = await discoverOpportunities();
    success(res, result);
  } catch (err) {
    next(err);
  }
};

export const recalculateWeightsHandler = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const result = await recalculateWeights();
    logActivity({
      userId:     req.user?.id,
      userEmail:  req.user?.email,
      eventType:  'adaptive_weights_recalculated',
      module:     'intelligence',
      entityType: 'adaptive_weight',
      title:      `Adaptive weights recalculated — ${result.usable_sample_size} samples, updated: ${result.weights_updated}`,
    });
    success(res, result);
  } catch (err) {
    next(err);
  }
};

import { Request, Response, NextFunction } from 'express';
import * as service from './prediction-accuracy.service';
import { success, paginated } from '../../utils/response';
import { logActivity } from '../../lib/activityLogger';

export const list = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { model_version, prediction_type, resolved, page, limit } = req.query as Record<string, string>;
    const result = await service.listPredictions({
      model_version,
      prediction_type,
      resolved: resolved !== undefined ? resolved === 'true' : undefined,
      page:  page  ? Number(page)  : undefined,
      limit: limit ? Number(limit) : undefined,
    });
    paginated(res, result.data, result.total, result.page, result.limit);
  } catch (err) {
    next(err);
  }
};

export const getPending = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { prediction_type } = req.query as Record<string, string>;
    const records = await service.listPendingPredictions(prediction_type);
    success(res, records);
  } catch (err) {
    next(err);
  }
};

export const getStats = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { model_version } = req.query as Record<string, string>;
    const stats = await service.getAccuracyStats(model_version);
    success(res, stats);
  } catch (err) {
    next(err);
  }
};

export const getPredictionById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const entry = await service.getPredictionById(req.params.id);
    success(res, entry);
  } catch (err) {
    next(err);
  }
};

export const log = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const entry = await service.logPrediction(req.body);
    logActivity({
      userId:     req.user?.id,
      userEmail:  req.user?.email,
      eventType:  'prediction_logged',
      module:     'prediction-accuracy',
      entityType: 'prediction_accuracy_log',
      entityId:   entry.id,
      title:      `Prediction logged: ${entry.prediction_type} (${entry.model_version})`,
    });
    success(res, entry, 201);
  } catch (err) {
    next(err);
  }
};

export const resolve = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const entry = await service.resolvePrediction(req.params.id, req.body);
    logActivity({
      userId:     req.user?.id,
      userEmail:  req.user?.email,
      eventType:  'prediction_resolved',
      module:     'prediction-accuracy',
      entityType: 'prediction_accuracy_log',
      entityId:   entry.id,
      title:      `Prediction resolved: accuracy ${entry.accuracy_score}`,
    });
    success(res, entry);
  } catch (err) {
    next(err);
  }
};

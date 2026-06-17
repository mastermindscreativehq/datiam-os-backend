import { eq, and, desc, count, avg, sql } from 'drizzle-orm';
import { db } from '../../db';
import { prediction_accuracy_log, predictionTypeEnum } from '../../db/schema';
import { AppError } from '../../middleware/errorHandler';
import type { LogPredictionInput, ResolvePredictionInput } from './prediction-accuracy.schema';

type PredictionType = typeof predictionTypeEnum.enumValues[number];

export interface PredictionListQuery {
  model_version?:   string;
  prediction_type?: string;
  resolved?:        boolean;
  page?:            number;
  limit?:           number;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const getPredictionById = async (id: string) => {
  if (!UUID_RE.test(id)) throw new AppError('Invalid UUID format', 400);
  const [entry] = await db
    .select()
    .from(prediction_accuracy_log)
    .where(eq(prediction_accuracy_log.id, id));
  if (!entry) throw new AppError('Prediction record not found', 404);
  return entry;
};

export const logPrediction = async (input: LogPredictionInput) => {
  const [entry] = await db
    .insert(prediction_accuracy_log)
    .values({
      ...input,
      predicted_value: input.predicted_value.toString(),
    })
    .returning();
  return entry;
};

export const resolvePrediction = async (id: string, input: ResolvePredictionInput) => {
  const [existing] = await db
    .select()
    .from(prediction_accuracy_log)
    .where(eq(prediction_accuracy_log.id, id));

  if (!existing) throw new AppError('Prediction record not found', 404);
  if (existing.resolved) throw new AppError('Prediction already resolved', 409);

  const predicted  = Number(existing.predicted_value);
  const actual     = input.actual_value;
  const errorMargin = Math.abs(actual - predicted);
  // Accuracy score assumes 0–100 scale; fee_estimate requires relative error — this is the base formula.
  const accuracyScore = Math.max(0, 100 - errorMargin);

  const [updated] = await db
    .update(prediction_accuracy_log)
    .set({
      actual_value:   actual.toString(),
      actual_label:   input.actual_label,
      error_margin:   errorMargin.toString(),
      accuracy_score: accuracyScore.toFixed(2),
      resolved:       true,
      resolved_at:    new Date(),
      notes:          input.notes ?? existing.notes,
    })
    .where(eq(prediction_accuracy_log.id, id))
    .returning();

  return updated;
};

export const listPredictions = async (query: PredictionListQuery = {}) => {
  const { model_version, prediction_type, resolved, page = 1, limit = 20 } = query;
  const offset = (page - 1) * limit;

  const conditions: ReturnType<typeof eq>[] = [];
  if (model_version)   conditions.push(eq(prediction_accuracy_log.model_version,   model_version));
  if (prediction_type) conditions.push(eq(prediction_accuracy_log.prediction_type, prediction_type as PredictionType));
  if (resolved !== undefined) conditions.push(eq(prediction_accuracy_log.resolved, resolved));

  const where = conditions.length > 0 ? and(...conditions) : undefined;

  const [rows, [{ total }]] = await Promise.all([
    db.select().from(prediction_accuracy_log).where(where).orderBy(desc(prediction_accuracy_log.created_at)).limit(limit).offset(offset),
    db.select({ total: count() }).from(prediction_accuracy_log).where(where),
  ]);

  return { data: rows, total: Number(total), page, limit };
};

export const listPendingPredictions = async (predictionType?: string) => {
  const conditions = [eq(prediction_accuracy_log.resolved, false)] as ReturnType<typeof eq>[];
  if (predictionType) conditions.push(eq(prediction_accuracy_log.prediction_type, predictionType as PredictionType));

  return db
    .select()
    .from(prediction_accuracy_log)
    .where(and(...conditions))
    .orderBy(prediction_accuracy_log.created_at);
};

export const getAccuracyStats = async (modelVersion?: string) => {
  const conditions = [eq(prediction_accuracy_log.resolved, true)] as ReturnType<typeof eq>[];
  if (modelVersion) conditions.push(eq(prediction_accuracy_log.model_version, modelVersion));

  return db
    .select({
      model_version:    prediction_accuracy_log.model_version,
      prediction_type:  prediction_accuracy_log.prediction_type,
      total_resolved:   count(),
      avg_accuracy:     avg(prediction_accuracy_log.accuracy_score),
      avg_error_margin: avg(prediction_accuracy_log.error_margin),
    })
    .from(prediction_accuracy_log)
    .where(and(...conditions))
    .groupBy(prediction_accuracy_log.model_version, prediction_accuracy_log.prediction_type)
    .orderBy(prediction_accuracy_log.model_version, prediction_accuracy_log.prediction_type);
};

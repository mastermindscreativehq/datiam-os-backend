import { eq, and, isNotNull, count, avg, sum, desc } from 'drizzle-orm';
import { db } from '../../db';
import {
  prediction_accuracy_log,
  placement_opportunities,
  licensing_contacts,
  songs,
} from '../../db/schema';
import { AppError } from '../../middleware/errorHandler';
import type { ResolveOutcomeInput } from './outcome-resolution.schema';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const PLACED_RESULTS = new Set([
  'placed', 'accepted', 'contracted', 'approved', 'won', 'success', 'yes',
]);

function calcAccuracy(predictedValue: string, actualResult: string): number {
  const raw = Number(predictedValue);
  // Normalize to 0-1: values >= 1 are treated as a percentage (e.g. 77 → 0.77)
  const p = raw >= 1 ? raw / 100 : raw;
  const placed = PLACED_RESULTS.has(actualResult.toLowerCase().trim());
  return placed ? p : 1 - p;
}

export const resolveOutcome = async (input: ResolveOutcomeInput) => {
  if (!UUID_RE.test(input.prediction_id)) throw new AppError('Invalid prediction_id UUID', 400);

  const [existing] = await db
    .select()
    .from(prediction_accuracy_log)
    .where(eq(prediction_accuracy_log.id, input.prediction_id));

  if (!existing) throw new AppError('Prediction record not found', 404);
  if (existing.resolved) throw new AppError('Prediction already resolved', 409);

  const accuracyScore = calcAccuracy(existing.predicted_value, input.actual_result);

  const [updated] = await db
    .update(prediction_accuracy_log)
    .set({
      actual_label:   input.actual_result,
      actual_revenue: input.revenue_generated != null ? input.revenue_generated.toString() : null,
      accuracy_score: accuracyScore.toFixed(4),
      resolved:       true,
      resolved_at:    new Date(),
      notes:          input.notes ?? existing.notes,
    })
    .where(eq(prediction_accuracy_log.id, input.prediction_id))
    .returning();

  return updated;
};

export const getModelPerformance = async () => {
  const [totals] = await db
    .select({
      total_predictions:   count(),
      resolved_predictions: count(prediction_accuracy_log.resolved_at),
    })
    .from(prediction_accuracy_log);

  const [accuracy] = await db
    .select({ average_accuracy: avg(prediction_accuracy_log.accuracy_score) })
    .from(prediction_accuracy_log)
    .where(eq(prediction_accuracy_log.resolved, true));

  const [revenue] = await db
    .select({ revenue_actual: sum(prediction_accuracy_log.actual_revenue) })
    .from(prediction_accuracy_log)
    .where(
      and(
        eq(prediction_accuracy_log.resolved, true),
        isNotNull(prediction_accuracy_log.actual_revenue),
      ),
    );

  const [revPredicted] = await db
    .select({ revenue_predicted: sum(prediction_accuracy_log.predicted_value) })
    .from(prediction_accuracy_log)
    .where(eq(prediction_accuracy_log.prediction_type, 'fee_estimate'));

  // best_genres — from songs linked to resolved predictions
  const genreRows = await db
    .select({
      genre:            songs.genre,
      avg_accuracy:     avg(prediction_accuracy_log.accuracy_score),
      prediction_count: count(),
    })
    .from(prediction_accuracy_log)
    .innerJoin(songs, eq(prediction_accuracy_log.song_id, songs.id))
    .where(
      and(
        eq(prediction_accuracy_log.resolved, true),
        isNotNull(songs.genre),
      ),
    )
    .groupBy(songs.genre)
    .orderBy(desc(avg(prediction_accuracy_log.accuracy_score)))
    .limit(5);

  // best_territories — from placement_opportunities linked to predictions
  const territoryRows = await db
    .select({
      territory:        placement_opportunities.territory,
      avg_accuracy:     avg(prediction_accuracy_log.accuracy_score),
      prediction_count: count(),
    })
    .from(prediction_accuracy_log)
    .innerJoin(
      placement_opportunities,
      eq(prediction_accuracy_log.opportunity_id, placement_opportunities.id),
    )
    .where(eq(prediction_accuracy_log.resolved, true))
    .groupBy(placement_opportunities.territory)
    .orderBy(desc(avg(prediction_accuracy_log.accuracy_score)))
    .limit(5);

  // best_contacts — licensing_contacts via placement_opportunities
  const contactRows = await db
    .select({
      contact_id:       licensing_contacts.id,
      contact_name:     licensing_contacts.full_name,
      avg_accuracy:     avg(prediction_accuracy_log.accuracy_score),
      prediction_count: count(),
    })
    .from(prediction_accuracy_log)
    .innerJoin(
      placement_opportunities,
      eq(prediction_accuracy_log.opportunity_id, placement_opportunities.id),
    )
    .innerJoin(
      licensing_contacts,
      eq(placement_opportunities.contact_id, licensing_contacts.id),
    )
    .where(eq(prediction_accuracy_log.resolved, true))
    .groupBy(licensing_contacts.id, licensing_contacts.full_name)
    .orderBy(desc(avg(prediction_accuracy_log.accuracy_score)))
    .limit(5);

  return {
    total_predictions:    Number(totals.total_predictions),
    resolved_predictions: Number(totals.resolved_predictions),
    average_accuracy:     accuracy.average_accuracy ? Number(Number(accuracy.average_accuracy).toFixed(4)) : null,
    revenue_predicted:    revPredicted.revenue_predicted ? Number(Number(revPredicted.revenue_predicted).toFixed(2)) : 0,
    revenue_actual:       revenue.revenue_actual ? Number(Number(revenue.revenue_actual).toFixed(2)) : 0,
    best_genres: genreRows.map(r => ({
      genre:            r.genre,
      avg_accuracy:     r.avg_accuracy ? Number(Number(r.avg_accuracy).toFixed(4)) : null,
      prediction_count: Number(r.prediction_count),
    })),
    best_territories: territoryRows.map(r => ({
      territory:        r.territory,
      avg_accuracy:     r.avg_accuracy ? Number(Number(r.avg_accuracy).toFixed(4)) : null,
      prediction_count: Number(r.prediction_count),
    })),
    best_contacts: contactRows.map(r => ({
      contact_id:       r.contact_id,
      contact_name:     r.contact_name,
      avg_accuracy:     r.avg_accuracy ? Number(Number(r.avg_accuracy).toFixed(4)) : null,
      prediction_count: Number(r.prediction_count),
    })),
  };
};

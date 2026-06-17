import { eq, and, desc, count, sum, avg, sql } from 'drizzle-orm';
import { db } from '../../db';
import { placement_outcomes, prediction_accuracy_log, placementOutcomeTypeEnum, syncLicenseTypeEnum } from '../../db/schema';
import { AppError } from '../../middleware/errorHandler';
import type { CreateOutcomeInput, UpdateOutcomeInput } from './placement-outcomes.schema';

type OutcomeType      = typeof placementOutcomeTypeEnum.enumValues[number];
type SyncLicenseType  = typeof syncLicenseTypeEnum.enumValues[number];

export interface OutcomeListQuery {
  artist_id?:    string;
  outcome?:      string;
  license_type?: string;
  page?:         number;
  limit?:        number;
}

// Maps placement outcome to a 0-100 numeric signal for the AI feedback loop.
// 'placed' is full success; all other outcomes are failures.
const OUTCOME_SIGNAL: Record<string, number> = {
  placed:               100,
  rejected:               0,
  expired:                0,
  negotiation_failed:     0,
  withdrawn_by_artist:    0,
};

export const listOutcomes = async (query: OutcomeListQuery = {}) => {
  const { artist_id, outcome, license_type, page = 1, limit = 20 } = query;
  const offset = (page - 1) * limit;

  const conditions: ReturnType<typeof eq>[] = [];
  if (artist_id)    conditions.push(eq(placement_outcomes.artist_id,   artist_id));
  if (outcome)      conditions.push(eq(placement_outcomes.outcome,     outcome as OutcomeType));
  if (license_type) conditions.push(eq(placement_outcomes.license_type, license_type as SyncLicenseType));

  const where = conditions.length > 0 ? and(...conditions) : undefined;

  const [rows, [{ total }]] = await Promise.all([
    db.select().from(placement_outcomes).where(where).orderBy(desc(placement_outcomes.created_at)).limit(limit).offset(offset),
    db.select({ total: count() }).from(placement_outcomes).where(where),
  ]);

  return { data: rows, total: Number(total), page, limit };
};

export const getOutcomeById = async (id: string) => {
  const [outcome] = await db
    .select()
    .from(placement_outcomes)
    .where(eq(placement_outcomes.id, id));
  if (!outcome) throw new AppError('Placement outcome not found', 404);
  return outcome;
};

export const getOutcomeByOpportunity = async (opportunityId: string) => {
  const [outcome] = await db
    .select()
    .from(placement_outcomes)
    .where(eq(placement_outcomes.opportunity_id, opportunityId));
  return outcome ?? null;
};

export const createOutcome = async (input: CreateOutcomeInput) => {
  let outcome;
  try {
    const [inserted] = await db
      .insert(placement_outcomes)
      .values({
        ...input,
        final_fee_usd:           input.final_fee_usd?.toString(),
        royalties_collected_usd: input.royalties_collected_usd?.toString(),
        ai_score_at_pitch:       input.ai_score_at_pitch?.toString(),
        outcome_quality_score:   input.outcome_quality_score?.toString(),
      })
      .returning();
    outcome = inserted;
  } catch (err: unknown) {
    if (typeof err === 'object' && err !== null && 'code' in err && (err as { code: string }).code === '23505') {
      throw new AppError('An outcome already exists for this opportunity', 409);
    }
    throw err;
  }

  // Auto-create a resolved accuracy record for the AI feedback loop when the
  // pitch had an AI score. The actual outcome signal closes the prediction loop.
  if (input.ai_score_at_pitch !== undefined) {
    const actualSignal  = OUTCOME_SIGNAL[input.outcome] ?? 0;
    const errorMargin   = Math.abs(actualSignal - input.ai_score_at_pitch);
    const accuracyScore = Math.max(0, 100 - errorMargin);

    db.insert(prediction_accuracy_log)
      .values({
        model_version:    'sync-intelligence-v1',
        prediction_type:  'placement_likelihood',
        opportunity_id:   input.opportunity_id,
        outcome_id:       outcome.id,
        song_id:          input.song_id,
        predicted_value:  input.ai_score_at_pitch.toString(),
        predicted_label:  `${input.ai_score_at_pitch}% placement probability`,
        actual_value:     actualSignal.toString(),
        actual_label:     input.outcome,
        error_margin:     errorMargin.toString(),
        accuracy_score:   accuracyScore.toFixed(2),
        resolved:         true,
        resolved_at:      new Date(),
        notes:            'Auto-resolved from placement outcome',
      })
      .catch((err: unknown) => {
        console.error('[PlacementOutcome] auto-accuracy insert failed:', err instanceof Error ? err.message : String(err));
      });
  }

  return outcome;
};

export const updateOutcome = async (id: string, input: UpdateOutcomeInput) => {
  const [updated] = await db
    .update(placement_outcomes)
    .set({
      ...input,
      final_fee_usd:           input.final_fee_usd?.toString(),
      royalties_collected_usd: input.royalties_collected_usd?.toString(),
      ai_score_at_pitch:       input.ai_score_at_pitch?.toString(),
      outcome_quality_score:   input.outcome_quality_score?.toString(),
      updated_at: new Date(),
    })
    .where(eq(placement_outcomes.id, id))
    .returning();
  if (!updated) throw new AppError('Placement outcome not found', 404);
  return updated;
};

export const getOutcomeStats = async (artistId: string) => {
  const rows = await db
    .select({
      outcome:      placement_outcomes.outcome,
      total:        count(),
      total_fees:   sum(placement_outcomes.final_fee_usd),
      avg_fee:      avg(placement_outcomes.final_fee_usd),
      avg_ai_score: avg(placement_outcomes.ai_score_at_pitch),
    })
    .from(placement_outcomes)
    .where(eq(placement_outcomes.artist_id, artistId))
    .groupBy(placement_outcomes.outcome)
    .orderBy(sql`count(*) desc`);

  const totalAll = rows.reduce((s, r) => s + Number(r.total), 0);
  const placed   = rows.find(r => r.outcome === 'placed');
  const win_rate = totalAll > 0 ? Math.round((Number(placed?.total ?? 0) / totalAll) * 100) : 0;

  return {
    artist_id:      artistId,
    win_rate_pct:   win_rate,
    total_outcomes: totalAll,
    by_outcome: rows.map(r => ({
      outcome:      r.outcome,
      count:        Number(r.total),
      total_fees:   r.total_fees   ? Number(r.total_fees)   : null,
      avg_fee:      r.avg_fee      ? Number(r.avg_fee)      : null,
      avg_ai_score: r.avg_ai_score ? Number(r.avg_ai_score) : null,
    })),
  };
};

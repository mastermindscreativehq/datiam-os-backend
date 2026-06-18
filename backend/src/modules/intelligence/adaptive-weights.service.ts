import { eq } from 'drizzle-orm';
import { db } from '../../db';
import { prediction_accuracy_log, adaptive_weight } from '../../db/schema';

const FACTORS = [
  'genre_fit',
  'bpm_fit',
  'mood_fit',
  'territory_fit',
  'artist_history',
  'company_match',
  'contact_match',
] as const;

type Factor = typeof FACTORS[number];

const MIN_SAMPLE_SIZE = 50;

const PLACED_LABELS = new Set([
  'placed', 'accepted', 'contracted', 'approved', 'won', 'success', 'yes',
]);

function isPlaced(label: string | null): boolean {
  return PLACED_LABELS.has((label ?? '').toLowerCase().trim());
}

function avg(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

function calcConfidence(sampleSize: number): number {
  if (sampleSize < MIN_SAMPLE_SIZE) return 0;
  // Grows from 0.50 at MIN_SAMPLE_SIZE to 0.95 at 200+
  const ratio = Math.min(1, (sampleSize - MIN_SAMPLE_SIZE) / (200 - MIN_SAMPLE_SIZE));
  return Math.round((0.50 + ratio * 0.45) * 100) / 100;
}

function normaliseToHundred(powers: Record<Factor, number>): Record<Factor, number> {
  const total = Object.values(powers).reduce((a, b) => a + b, 0);
  if (total <= 0) {
    // All factors equally weighted when no signal
    const equal = Math.round(100 / FACTORS.length);
    return Object.fromEntries(FACTORS.map(f => [f, equal])) as Record<Factor, number>;
  }

  const weights = Object.fromEntries(
    FACTORS.map(f => [f, Math.round((powers[f] / total) * 100)]),
  ) as Record<Factor, number>;

  // Fix rounding drift — assign any remainder to the highest-weight factor
  const sum = Object.values(weights).reduce((a, b) => a + b, 0);
  if (sum !== 100) {
    const topFactor = FACTORS.slice().sort((a, b) => weights[b] - weights[a])[0];
    weights[topFactor] += (100 - sum);
  }

  return weights;
}

export interface FactorAnalysis {
  factor:          Factor;
  current_weight:  number;
  recommended_weight: number | null;
  previous_weight: number | null;
  avg_score_placed:     number;
  avg_score_not_placed: number;
  predictive_power:     number;
  placed_count:         number;
  not_placed_count:     number;
  confidence:      number;
  sample_size:     number;
}

export interface AdaptiveWeightsResult {
  factors:               FactorAnalysis[];
  total_resolved:        number;
  usable_sample_size:    number;
  sufficient_data:       boolean;
  weights_updated:       boolean;
  message:               string;
  last_recalculated_at:  string;
}

export const getAdaptiveWeights = async () => {
  const rows = await db
    .select()
    .from(adaptive_weight)
    .orderBy(adaptive_weight.factor_name);

  return rows.map(r => ({
    id:                   r.id,
    factor_name:          r.factor_name,
    current_weight:       Number(r.current_weight),
    previous_weight:      r.previous_weight != null ? Number(r.previous_weight) : null,
    recommended_weight:   r.recommended_weight != null ? Number(r.recommended_weight) : null,
    confidence:           Number(r.confidence),
    sample_size:          r.sample_size,
    last_recalculated_at: r.last_recalculated_at ?? null,
    updated_at:           r.updated_at,
  }));
};

export const recalculateWeights = async (): Promise<AdaptiveWeightsResult> => {
  // 1. Fetch all resolved prediction records
  const resolved = await db
    .select()
    .from(prediction_accuracy_log)
    .where(eq(prediction_accuracy_log.resolved, true));

  const totalResolved = resolved.length;

  // 2. Filter to records that have individual factor scores in feature_vector
  const withFactors = resolved.filter(row => {
    const fv = row.feature_vector as Record<string, unknown> | null;
    return fv != null && FACTORS.some(f => typeof fv[f] === 'number');
  });

  const usableSampleSize = withFactors.length;
  const sufficientData   = usableSampleSize >= MIN_SAMPLE_SIZE;
  const confidence       = calcConfidence(usableSampleSize);
  const now              = new Date();

  // 3. For each factor, separate placed vs not-placed and compute predictive power
  const powers = {} as Record<Factor, number>;
  const factorStats: Record<Factor, {
    placedScores:    number[];
    notPlacedScores: number[];
  }> = {} as never;

  for (const factor of FACTORS) {
    factorStats[factor] = { placedScores: [], notPlacedScores: [] };
  }

  for (const row of withFactors) {
    const fv = row.feature_vector as Record<string, unknown>;
    const placed = isPlaced(row.actual_label);

    for (const factor of FACTORS) {
      const score = fv[factor];
      if (typeof score === 'number') {
        if (placed) {
          factorStats[factor].placedScores.push(score);
        } else {
          factorStats[factor].notPlacedScores.push(score);
        }
      }
    }
  }

  for (const factor of FACTORS) {
    const { placedScores, notPlacedScores } = factorStats[factor];
    const avgPlaced    = avg(placedScores);
    const avgNotPlaced = avg(notPlacedScores);
    // Predictive power = raw separation; floor at 0 (negative = factor actively hurts, treat as near-zero)
    powers[factor] = Math.max(0, avgPlaced - avgNotPlaced);
  }

  const recommendedWeights = normaliseToHundred(powers);

  // 4. Fetch current weights from DB
  const currentRows = await db
    .select()
    .from(adaptive_weight)
    .orderBy(adaptive_weight.factor_name);

  const currentMap = new Map(currentRows.map(r => [r.factor_name, r]));

  // 5. Build response and conditionally persist recommendations
  const factorResults: FactorAnalysis[] = FACTORS.map(factor => {
    const { placedScores, notPlacedScores } = factorStats[factor];
    const avgPlaced    = avg(placedScores);
    const avgNotPlaced = avg(notPlacedScores);
    const row          = currentMap.get(factor);

    return {
      factor,
      current_weight:       row ? Number(row.current_weight) : 0,
      recommended_weight:   sufficientData ? recommendedWeights[factor] : null,
      previous_weight:      row?.previous_weight != null ? Number(row.previous_weight) : null,
      avg_score_placed:     Math.round(avgPlaced    * 100) / 100,
      avg_score_not_placed: Math.round(avgNotPlaced * 100) / 100,
      predictive_power:     Math.round(powers[factor] * 100) / 100,
      placed_count:         placedScores.length,
      not_placed_count:     notPlacedScores.length,
      confidence,
      sample_size:          usableSampleSize,
    };
  });

  // 6. Persist recommendations only when we have sufficient data
  if (sufficientData) {
    for (const factor of FACTORS) {
      const existing = currentMap.get(factor);
      if (existing) {
        await db
          .update(adaptive_weight)
          .set({
            recommended_weight:   recommendedWeights[factor].toString(),
            confidence:           confidence.toFixed(2),
            sample_size:          usableSampleSize,
            last_recalculated_at: now,
            updated_at:           now,
          })
          .where(eq(adaptive_weight.factor_name, factor));
      } else {
        await db.insert(adaptive_weight).values({
          factor_name:          factor,
          current_weight:       '0',
          recommended_weight:   recommendedWeights[factor].toString(),
          confidence:           confidence.toFixed(2),
          sample_size:          usableSampleSize,
          last_recalculated_at: now,
        });
      }
    }
  }

  const message = sufficientData
    ? `Analysis complete. Recommendations generated from ${usableSampleSize} resolved predictions with factor scores.`
    : `Insufficient data: ${usableSampleSize} usable records found (${MIN_SAMPLE_SIZE} required). Weights not updated. Submit more opportunities and resolve outcomes to enable adaptive learning.`;

  return {
    factors:              factorResults,
    total_resolved:       totalResolved,
    usable_sample_size:   usableSampleSize,
    sufficient_data:      sufficientData,
    weights_updated:      sufficientData,
    message,
    last_recalculated_at: now.toISOString(),
  };
};

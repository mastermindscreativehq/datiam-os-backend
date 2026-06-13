import type { SyncCategory, CategoryScore } from '../sync-intelligence/sync-intelligence.types';
import { SYNC_CATEGORY_LABELS } from '../sync-intelligence/sync-intelligence.types';
import type { RevenueForecast, LikelihoodLevel, RevenueClass } from './commercial-intelligence.types';

// ── Industry License Benchmarks (2024–2025 mid-market rates USD) ──────────────

interface LicenseBenchmark {
  baseMin: number;
  baseMax: number;
  placementsPerYearHigh: number;
  placementsPerYearMedium: number;
  placementsPerYearLow: number;
  commercialValue: string;
}

const LICENSE_BENCHMARKS: Record<SyncCategory, LicenseBenchmark> = {
  film_trailer: {
    baseMin: 8_000,
    baseMax: 75_000,
    placementsPerYearHigh: 3,
    placementsPerYearMedium: 1,
    placementsPerYearLow: 0.3,
    commercialValue: 'Very High — major studio trailer placements command premium licensing with full buy-out options',
  },
  netflix_drama: {
    baseMin: 5_000,
    baseMax: 25_000,
    placementsPerYearHigh: 4,
    placementsPerYearMedium: 2,
    placementsPerYearLow: 0.5,
    commercialValue: 'High — streaming drama placements offer strong per-episode rates with potential for series-wide licensing',
  },
  documentary: {
    baseMin: 500,
    baseMax: 6_000,
    placementsPerYearHigh: 5,
    placementsPerYearMedium: 2,
    placementsPerYearLow: 0.5,
    commercialValue: 'Moderate — documentary licensing offers lower per-placement rates but consistent volume for authentic-sounding tracks',
  },
  sports_content: {
    baseMin: 500,
    baseMax: 10_000,
    placementsPerYearHigh: 6,
    placementsPerYearMedium: 3,
    placementsPerYearLow: 0.5,
    commercialValue: 'High — sports media generates high volume licensing across broadcasts, brand campaigns, and athlete content',
  },
  gaming: {
    baseMin: 2_000,
    baseMax: 15_000,
    placementsPerYearHigh: 3,
    placementsPerYearMedium: 1,
    placementsPerYearLow: 0.3,
    commercialValue: 'High — AAA game placements offer strong licensing with potential for full buy-out across platforms',
  },
  fashion: {
    baseMin: 2_000,
    baseMax: 12_000,
    placementsPerYearHigh: 4,
    placementsPerYearMedium: 2,
    placementsPerYearLow: 0.5,
    commercialValue: 'High — fashion brand campaigns offer consistent licensing with premium rates for luxury tier placements',
  },
  luxury_brands: {
    baseMin: 5_000,
    baseMax: 40_000,
    placementsPerYearHigh: 2,
    placementsPerYearMedium: 1,
    placementsPerYearLow: 0.2,
    commercialValue: 'Very High — luxury brand placements are rare but command the highest per-placement rates in the market',
  },
  travel_campaigns: {
    baseMin: 1_000,
    baseMax: 10_000,
    placementsPerYearHigh: 4,
    placementsPerYearMedium: 2,
    placementsPerYearLow: 0.5,
    commercialValue: 'Moderate-High — travel campaign licensing offers strong rates with seasonal peaks around major travel periods',
  },
  commercial_ads: {
    baseMin: 5_000,
    baseMax: 60_000,
    placementsPerYearHigh: 4,
    placementsPerYearMedium: 2,
    placementsPerYearLow: 0.5,
    commercialValue: 'Very High — national advertising campaigns offer the highest per-placement rates outside of major film placements',
  },
  social_content: {
    baseMin: 200,
    baseMax: 3_000,
    placementsPerYearHigh: 20,
    placementsPerYearMedium: 8,
    placementsPerYearLow: 2,
    commercialValue: 'Emerging — social content licensing generates lower per-placement rates but highest volume and brand exposure potential',
  },
};

// ── Tier logic ────────────────────────────────────────────────────────────────

function likelihood(score: number): LikelihoodLevel {
  if (score >= 75) return 'High';
  if (score >= 55) return 'Medium';
  if (score >= 35) return 'Low';
  return 'Very Low';
}

function revenueClass(score: number): RevenueClass {
  if (score >= 75) return 'Premium';
  if (score >= 55) return 'Emerging';
  if (score >= 35) return 'Speculative';
  return 'Marginal';
}

function scaledRange(score: number, baseMin: number, baseMax: number): [number, number] {
  const factor = score >= 75 ? 1.0 : score >= 55 ? 0.7 : score >= 35 ? 0.4 : 0.15;
  return [
    Math.round(baseMin * factor),
    Math.round(baseMax * factor),
  ];
}

function formatCurrency(value: number): string {
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `$${(value / 1_000).toFixed(0)}K`;
  return `$${value}`;
}

// ── Public API ─────────────────────────────────────────────────────────────────

export function buildRevenueForecast(
  categoryScores: Record<SyncCategory, CategoryScore>,
): RevenueForecast[] {
  return (Object.keys(LICENSE_BENCHMARKS) as SyncCategory[])
    .map(cat => {
      const score = categoryScores[cat].score;
      const bench = LICENSE_BENCHMARKS[cat];
      const [rangeMin, rangeMax] = scaledRange(score, bench.baseMin, bench.baseMax);
      const lik = likelihood(score);
      const revClass = revenueClass(score);

      const placementsPerYear = lik === 'High'
        ? bench.placementsPerYearHigh
        : lik === 'Medium'
        ? bench.placementsPerYearMedium
        : bench.placementsPerYearLow;

      const annualMin = Math.round(rangeMin * placementsPerYear);
      const annualMax = Math.round(rangeMax * placementsPerYear);

      return {
        category: cat,
        label: SYNC_CATEGORY_LABELS[cat],
        licenseRangeMin: rangeMin,
        licenseRangeMax: rangeMax,
        formattedRange: `${formatCurrency(rangeMin)}–${formatCurrency(rangeMax)}`,
        likelihood: lik,
        revenueClass: revClass,
        commercialValue: bench.commercialValue,
        annualEstimateMin: annualMin,
        annualEstimateMax: annualMax,
        formattedAnnualEstimate: `${formatCurrency(annualMin)}–${formatCurrency(annualMax)}/yr`,
      };
    })
    .sort((a, b) => b.licenseRangeMax - a.licenseRangeMax);
}

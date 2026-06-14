import type { SyncCategory, CategoryScore } from '../sync-intelligence/sync-intelligence.types';
import type { RevenueTierForecast, RevenueTierEntry, RevenueTierBreakdown } from './commercial-intelligence.types';

function fmt(v: number): string {
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `$${(v / 1_000).toFixed(0)}K`;
  return `$${v}`;
}

function bd(
  sMin: number, sMax: number,
  cMin: number, cMax: number,
  spMin: number, spMax: number,
  bMin: number, bMax: number,
): RevenueTierBreakdown {
  return {
    syncPotential:    { min: sMin,  max: sMax,  formatted: `${fmt(sMin)}–${fmt(sMax)}` },
    creatorLicensing: { min: cMin,  max: cMax,  formatted: `${fmt(cMin)}–${fmt(cMax)}` },
    sportsContent:    { min: spMin, max: spMax, formatted: `${fmt(spMin)}–${fmt(spMax)}` },
    brandPlacement:   { min: bMin,  max: bMax,  formatted: `${fmt(bMin)}–${fmt(bMax)}` },
  };
}

function buildTier(
  mult: number,
  overallScore: number,
  topScore: number,
  sportsScore: number,
  creatorScore: number,
  brandScore: number,
  assumptions: string,
): RevenueTierEntry {
  const sf = overallScore / 100;
  const tf = topScore / 100;

  const syncMin    = Math.round(20_000 * sf * tf * mult * 0.40);
  const syncMax    = Math.round(20_000 * sf * tf * mult * 1.20);
  const creatorMin = Math.round(8_000  * (creatorScore / 100) * mult * 0.50);
  const creatorMax = Math.round(8_000  * (creatorScore / 100) * mult * 1.50);
  const sportsMin  = Math.round(15_000 * (sportsScore / 100) * mult * 0.40);
  const sportsMax  = Math.round(15_000 * (sportsScore / 100) * mult * 1.30);
  const brandMin   = Math.round(25_000 * (brandScore / 100) * mult * 0.40);
  const brandMax   = Math.round(25_000 * (brandScore / 100) * mult * 1.50);

  const totalMin = syncMin + creatorMin + sportsMin + brandMin;
  const totalMax = syncMax + creatorMax + sportsMax + brandMax;

  return {
    totalMin,
    totalMax,
    formattedTotal: `${fmt(totalMin)}–${fmt(totalMax)}/yr`,
    breakdown: bd(syncMin, syncMax, creatorMin, creatorMax, sportsMin, sportsMax, brandMin, brandMax),
    assumptions,
  };
}

export function buildRevenueTierForecast(
  categoryScores: Record<SyncCategory, CategoryScore>,
  overallScore: number,
): RevenueTierForecast {
  const topScore    = Math.max(...Object.values(categoryScores).map(c => c.score));
  const sportsScore = categoryScores.sports_content.score;
  const socialScore = categoryScores.social_content.score;
  const luxuryScore = categoryScores.luxury_brands.score;
  const commScore   = categoryScores.commercial_ads.score;
  const brandScore  = Math.round((luxuryScore + commScore) / 2);

  return {
    conservative: buildTier(
      0.40, overallScore, topScore, sportsScore, socialScore, brandScore,
      '1–2 placements/yr in primary category only. No brand campaigns. Library submission approach only.',
    ),
    expected: buildTier(
      1.00, overallScore, topScore, sportsScore, socialScore, brandScore,
      '3–5 sync placements/yr across top categories. 2–3 brand/creator deals. Targeted pitch campaign.',
    ),
    aggressive: buildTier(
      2.50, overallScore, topScore, sportsScore, socialScore, brandScore,
      '8–15 placements/yr across all viable categories. Major brand deal secured. Dedicated sync agent representation.',
    ),
  };
}

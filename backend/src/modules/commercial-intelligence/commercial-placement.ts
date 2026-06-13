import type { PlacementClass, CommercialPlacementPotential } from './commercial-intelligence.types';

const CLASSIFICATION_THRESHOLDS: Array<{ min: number; max: number; classification: PlacementClass; description: string; colorKey: CommercialPlacementPotential['colorKey'] }> = [
  {
    min: 81,
    max: 100,
    classification: 'Exceptional',
    description: 'Elite commercial placement candidate. Suitable for major studio campaigns, premium streaming placements, and high-value licensing across multiple categories. Priority pitch material.',
    colorKey: 'cyan',
  },
  {
    min: 61,
    max: 80,
    classification: 'Strong',
    description: 'Strong commercial placement potential across primary categories. Well-positioned for targeted pitching to music supervisors, sync agencies, and brand campaigns.',
    colorKey: 'green',
  },
  {
    min: 41,
    max: 60,
    classification: 'Moderate',
    description: 'Moderate placement opportunity in specialist categories. Best suited for targeted niche pitching. Library submission and curated outreach recommended over broad campaigns.',
    colorKey: 'yellow',
  },
  {
    min: 21,
    max: 40,
    classification: 'Low',
    description: 'Limited mainstream sync appeal. Specialist or boutique placement opportunities exist within specific niche categories. Production development may strengthen commercial positioning.',
    colorKey: 'orange',
  },
  {
    min: 0,
    max: 20,
    classification: 'Very Low',
    description: 'Minimal commercial sync utility in current form. Significant production or arrangement work recommended before active pitching. Consider instrumental version development.',
    colorKey: 'red',
  },
];

export function buildCommercialPlacementPotential(overallSyncScore: number): CommercialPlacementPotential {
  // Round before tier lookup so fractional scores (e.g. 80.5) don't fall through
  // the gap between integer tier boundaries (Strong max=80, Exceptional min=81).
  const rounded = Math.round(overallSyncScore);
  const tier = CLASSIFICATION_THRESHOLDS.find(t => rounded >= t.min && rounded <= t.max)
    ?? CLASSIFICATION_THRESHOLDS[CLASSIFICATION_THRESHOLDS.length - 1];

  return {
    score: rounded,
    classification: tier.classification,
    description: tier.description,
    colorKey: tier.colorKey,
  };
}

import type { HistoricalContext } from './opportunity-analyzer.service';

export const calculateConfidence = (context: HistoricalContext): number => {
  let confidence = 0.30; // baseline

  // Artist history adds significant confidence
  if (context.artist_total_outcomes >= 20) {
    confidence += 0.20;
  } else if (context.artist_total_outcomes >= 10) {
    confidence += 0.15;
  } else if (context.artist_total_outcomes >= 3) {
    confidence += 0.10;
  } else if (context.artist_total_outcomes >= 1) {
    confidence += 0.05;
  }

  // Company data quality
  if (context.company) {
    confidence += 0.10;
    if (context.company.genre_focus.length > 0) confidence += 0.03;
    if (context.company.deal_volume_per_year) confidence += 0.02;
  }

  // Contact relationship depth
  if (context.contact) {
    if (context.contact.relationship_status === 'active') {
      confidence += 0.12;
    } else if (context.contact.relationship_status === 'prospect') {
      confidence += 0.07;
    } else if (context.contact.relationship_status === 'dormant') {
      confidence += 0.04;
    }

    if (context.contact.relationship_score && context.contact.relationship_score >= 7) {
      confidence += 0.05;
    }

    if (context.contact.genre_preferences.length > 0) confidence += 0.03;
  }

  // Territory data volume
  if (context.territory_total_outcomes >= 10) {
    confidence += 0.06;
  } else if (context.territory_total_outcomes >= 5) {
    confidence += 0.04;
  } else if (context.territory_total_outcomes >= 1) {
    confidence += 0.02;
  }

  // Prediction model maturity (validated historical accuracy)
  if (context.prediction_accuracy > 70) {
    confidence += 0.05;
  } else if (context.prediction_accuracy > 50) {
    confidence += 0.03;
  }

  // Clamp to [0.15, 0.92]
  return Math.min(0.92, Math.max(0.15, parseFloat(confidence.toFixed(2))));
};

import type { AnalyzeOpportunityInput } from './intelligence.schema';
import type { HistoricalContext } from './opportunity-analyzer.service';

interface MatchScores {
  company_match:  number;
  contact_match:  number;
  total:          number;
}

const TIER_SCORES: Record<string, number> = {
  tier_a:  25,
  tier_b:  18,
  tier_c:  10,
  unrated: 12,
};

const RELATIONSHIP_STATUS_SCORES: Record<string, number> = {
  active:       1.0,
  prospect:     0.6,
  dormant:      0.35,
  unresponsive: 0.15,
  blacklisted:  0.0,
};

function genreMatches(inputGenre: string, preferences: string[]): boolean {
  if (!preferences.length) return false;
  const inputLower = inputGenre.toLowerCase();
  return preferences.some(
    p => p.toLowerCase().includes(inputLower) || inputLower.includes(p.toLowerCase()),
  );
}

export const calculateMatchScore = (
  input: AnalyzeOpportunityInput,
  context: HistoricalContext,
): MatchScores => {
  let company_match = 0;

  if (context.company) {
    const { tier, genre_focus, deal_volume_per_year } = context.company;

    const tierScore = TIER_SCORES[tier] ?? 12;

    // Genre focus match (0-20)
    let genreFocusScore = 12; // neutral
    if (genre_focus.length > 0) {
      genreFocusScore = genreMatches(input.genre, genre_focus) ? 20 : 5;
    }

    // Deal volume bonus (0-5) — active companies with high volume get a small bonus
    const volumeBonus =
      deal_volume_per_year && deal_volume_per_year > 10
        ? 5
        : deal_volume_per_year && deal_volume_per_year > 3
        ? 3
        : 0;

    company_match = Math.min(50, tierScore + genreFocusScore + volumeBonus);
  } else {
    // No company data — neutral half-score
    company_match = 22;
  }

  let contact_match = 0;

  if (context.contact) {
    const { relationship_status, relationship_score, genre_preferences, last_contacted_at } = context.contact;

    // Relationship status base (0-30)
    const statusMultiplier = RELATIONSHIP_STATUS_SCORES[relationship_status] ?? 0.5;
    // relationship_score (1-10) scales status — default to 5 if not set
    const relScore = relationship_score ?? 5;
    const relationshipPoints = Math.round(statusMultiplier * (relScore / 10) * 30);

    // Genre preference match (0-20)
    let prefScore = 12; // neutral
    if (genre_preferences.length > 0) {
      prefScore = genreMatches(input.genre, genre_preferences) ? 20 : 5;
    }

    // Recency bonus: last contacted within 90 days = +3
    let recencyBonus = 0;
    if (last_contacted_at) {
      const daysSince = (Date.now() - last_contacted_at.getTime()) / (1000 * 60 * 60 * 24);
      if (daysSince <= 30) recencyBonus = 3;
      else if (daysSince <= 90) recencyBonus = 2;
    }

    contact_match = Math.min(50, relationshipPoints + prefScore + recencyBonus);
  } else {
    // No contact data — neutral half-score
    contact_match = 20;
  }

  const total = Math.min(100, company_match + contact_match);

  return { company_match, contact_match, total };
};

import type { AnalyzeOpportunityInput, Recommendation } from './intelligence.schema';
import type { HistoricalContext } from './opportunity-analyzer.service';

interface ScoringContext {
  placementScore:  number;
  matchScore:      number;
  genre_fit:       number;
  bpm_fit:         number;
  mood_fit:        number;
  territory_fit:   number;
  artist_history:  number;
  company_match:   number;
  contact_match:   number;
  probability:     number;
}

export const generateRecommendations = (
  input: AnalyzeOpportunityInput,
  context: HistoricalContext,
  scores: ScoringContext,
): Recommendation[] => {
  const recs: Recommendation[] = [];

  // ── Contact recommendations ───────────────────────────────────────────────

  if (context.contact) {
    const { relationship_status, relationship_score, last_contacted_at } = context.contact;

    if (relationship_status === 'dormant' || relationship_status === 'unresponsive') {
      recs.push({
        priority:  'high',
        action:    `Re-engage ${context.contact.full_name} before pitching`,
        rationale: `Contact status is "${relationship_status}". A warm-up touchpoint improves response rate by 2-3×.`,
        category:  'contact',
      });
    }

    if (relationship_status === 'blacklisted') {
      recs.push({
        priority:  'high',
        action:    'Find an alternative contact at this company',
        rationale: 'This contact is marked as blacklisted. Pitching them directly may damage the company relationship.',
        category:  'contact',
      });
    }

    if (last_contacted_at) {
      const daysSince = (Date.now() - last_contacted_at.getTime()) / (1000 * 60 * 60 * 24);
      if (daysSince > 90 && relationship_status !== 'blacklisted') {
        recs.push({
          priority:  'medium',
          action:    `Send a relationship touchpoint to ${context.contact.full_name}`,
          rationale: `Last contact was ${Math.round(daysSince)} days ago. Refreshing the relationship before a pitch improves open rates.`,
          category:  'timing',
        });
      }
    }

    if (!relationship_score || relationship_score <= 3) {
      recs.push({
        priority:  'medium',
        action:    'Build the relationship score before pitching premium material',
        rationale: `Low relationship score (${relationship_score ?? 'unscored'}/10) suggests this contact needs more nurturing. Share a demo or industry insight first.`,
        category:  'contact',
      });
    }
  } else if (input.company_id) {
    recs.push({
      priority:  'high',
      action:    'Identify and add a licensing contact at this company',
      rationale: 'No contact on file for this company. Having a named contact increases placement probability by ~40%.',
      category:  'contact',
    });
  }

  // ── Company recommendations ───────────────────────────────────────────────

  if (context.company) {
    if (context.company.tier === 'tier_c' || context.company.tier === 'unrated') {
      recs.push({
        priority:  'medium',
        action:    'Consider adding tier_a or tier_b companies to your target list',
        rationale: `${context.company.name} is rated ${context.company.tier}. Diversifying to premium-tier companies improves revenue potential and portfolio credibility.`,
        category:  'company',
      });
    }

    const genreFocus = context.company.genre_focus;
    if (
      genreFocus.length > 0 &&
      !genreFocus.some(g => g.toLowerCase().includes(input.genre.toLowerCase()))
    ) {
      recs.push({
        priority:  'medium',
        action:    `Adjust the pitch angle to highlight how your ${input.genre} track fits ${context.company.name}'s content`,
        rationale: `${context.company.name} focuses on ${genreFocus.slice(0, 2).join(', ')}. Framing your pitch to address their genre needs improves relevance.`,
        category:  'company',
      });
    }
  }

  // ── Track / audio recommendations ────────────────────────────────────────

  if (scores.bpm_fit < 10) {
    const licenseType = input.license_type ?? 'this placement type';
    recs.push({
      priority:  'high',
      action:    `Create a BPM edit optimized for ${licenseType}`,
      rationale: `BPM ${input.bpm} is outside the ideal range for ${licenseType}. A tempo-adjusted edit could significantly increase placement chances.`,
      category:  'track',
    });
  }

  if (scores.mood_fit < 8) {
    recs.push({
      priority:  'medium',
      action:    `Consider a remix that amplifies the ${input.mood} mood quality`,
      rationale: `Mood fit score is low for this license type. Supervisors in this category prefer more pronounced emotional alignment.`,
      category:  'track',
    });
  }

  if (scores.genre_fit < 12) {
    recs.push({
      priority:  'low',
      action:    `Explore alternative license types better suited to ${input.genre}`,
      rationale: `Genre fit for the target placement type is below average. Other categories may convert at higher rates for this genre.`,
      category:  'track',
    });
  }

  // ── Territory recommendations ─────────────────────────────────────────────

  if (scores.territory_fit < 5 && context.territory_total_outcomes > 5) {
    recs.push({
      priority:  'medium',
      action:    `Expand pitch targets to territories with stronger win rates`,
      rationale: `Historical win rate in ${input.territory} is below average. Consider US, UK, or Western Europe as primary targets.`,
      category:  'territory',
    });
  }

  // ── Artist history recommendations ────────────────────────────────────────

  if (context.artist_total_outcomes === 0) {
    recs.push({
      priority:  'low',
      action:    'Log placement outcomes to improve future prediction accuracy',
      rationale: 'No historical placement data found. Tracking outcomes helps calibrate the scoring engine for your catalog.',
      category:  'timing',
    });
  } else if (scores.artist_history < 8) {
    recs.push({
      priority:  'medium',
      action:    'Target music library placements to build a win-rate baseline',
      rationale: `Current win rate is ${Math.round(context.artist_win_rate * 100)}%. Music library deals are easier to convert and build portfolio credibility.`,
      category:  'timing',
    });
  }

  // ── High probability bonus recommendation ─────────────────────────────────

  if (scores.probability >= 0.65 && recs.filter(r => r.priority === 'high').length === 0) {
    recs.push({
      priority:  'high',
      action:    'This is a strong opportunity — initiate pitch within 48 hours',
      rationale: `Placement probability is ${Math.round(scores.probability * 100)}%. High-score opportunities perform best when acted on quickly.`,
      category:  'timing',
    });
  }

  // Sort: high → medium → low, deduplicate similar categories
  const priorityOrder = { high: 0, medium: 1, low: 2 };
  return recs
    .sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority])
    .slice(0, 5);
};

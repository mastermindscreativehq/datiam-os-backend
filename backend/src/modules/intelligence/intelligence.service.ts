import { db } from '../../db';
import { prediction_accuracy_log } from '../../db/schema';
import type { AnalyzeOpportunityInput, PlacementAnalysisResult } from './intelligence.schema';
import { gatherHistoricalContext } from './opportunity-analyzer.service';
import { calculatePlacementScore } from './placement-scoring.service';
import { calculateMatchScore } from './match-score.service';
import { calculateConfidence } from './confidence-calculator.service';
import { generateRecommendations } from './recommendation.service';

const MODEL_VERSION = 'datiam-intelligence-v1';

function buildReasoning(
  input: AnalyzeOpportunityInput,
  probability: number,
  confidence: number,
  placementTotal: number,
  matchTotal: number,
  genreFit: number,
  bpmFit: number,
  moodFit: number,
  artistHistory: number,
  companyMatch: number,
  contactMatch: number,
  artistWinRate: number,
  artistOutcomes: number,
  companyName: string | null,
  contactName: string | null,
): string {
  const probabilityPct = Math.round(probability * 100);
  const confidencePct  = Math.round(confidence * 100);
  const licenseType    = input.license_type ?? 'general sync';

  const parts: string[] = [];

  parts.push(
    `Placement probability is ${probabilityPct}% with ${confidencePct}% confidence for a ${input.genre} track targeting ${licenseType} in ${input.territory}.`,
  );

  // Track quality
  const trackQuality = Math.round((genreFit + bpmFit + moodFit) / 60 * 100);
  if (trackQuality >= 70) {
    parts.push(
      `Track profile is strong: ${input.genre} genre aligns well with this placement category, BPM ${input.bpm} fits the tempo range, and "${input.mood}" mood is a natural fit.`,
    );
  } else if (trackQuality >= 45) {
    parts.push(
      `Track profile shows moderate fit: ${input.genre}/${input.mood} at ${input.bpm} BPM has some alignment with ${licenseType} requirements, but there are optimization opportunities.`,
    );
  } else {
    parts.push(
      `Track profile shows limited fit for ${licenseType}: ${input.genre} genre and "${input.mood}" mood may not align with typical supervisor expectations for this category.`,
    );
  }

  // Artist history
  if (artistOutcomes > 0) {
    const winPct = Math.round(artistWinRate * 100);
    parts.push(
      `Artist's historical win rate is ${winPct}% across ${artistOutcomes} tracked placement${artistOutcomes !== 1 ? 's' : ''}.`,
    );
  } else {
    parts.push('No historical placement data available for this artist — baseline industry rates applied.');
  }

  // Opportunity context
  if (companyName && contactName) {
    parts.push(
      `Opportunity is with ${companyName} via ${contactName}. Company and contact match scores are factored into the combined analysis.`,
    );
  } else if (companyName) {
    parts.push(`Targeting ${companyName} — no named contact on file, which reduces match confidence.`);
  } else {
    parts.push('No company or contact context provided — match score is based on track metadata alone.');
  }

  return parts.join(' ');
}

export const analyzeOpportunity = async (
  input: AnalyzeOpportunityInput,
): Promise<PlacementAnalysisResult> => {
  const context = await gatherHistoricalContext(input);

  const placementScores = calculatePlacementScore(input, context);
  const matchScores     = calculateMatchScore(input, context);

  // Weighted combination: placement quality 55%, opportunity match 45%
  const rawProbability = (placementScores.total * 0.55 + matchScores.total * 0.45) / 100;

  // Clamp to realistic range — avoid 0% and 100% overconfidence
  const placement_probability = parseFloat(
    Math.min(0.97, Math.max(0.03, rawProbability)).toFixed(2),
  );

  const confidence = calculateConfidence(context);

  const reasoning = buildReasoning(
    input,
    placement_probability,
    confidence,
    placementScores.total,
    matchScores.total,
    placementScores.genre_fit,
    placementScores.bpm_fit,
    placementScores.mood_fit,
    placementScores.artist_history,
    matchScores.company_match,
    matchScores.contact_match,
    context.artist_win_rate,
    context.artist_total_outcomes,
    context.company?.name ?? null,
    context.contact?.full_name ?? null,
  );

  const recommendations = generateRecommendations(input, context, {
    placementScore:  placementScores.total,
    matchScore:      matchScores.total,
    genre_fit:       placementScores.genre_fit,
    bpm_fit:         placementScores.bpm_fit,
    mood_fit:        placementScores.mood_fit,
    territory_fit:   placementScores.territory_fit,
    artist_history:  placementScores.artist_history,
    company_match:   matchScores.company_match,
    contact_match:   matchScores.contact_match,
    probability:     placement_probability,
  });

  const featureVector: Record<string, unknown> = {
    genre:        input.genre,
    mood:         input.mood,
    bpm:          input.bpm,
    territory:    input.territory,
    license_type: input.license_type ?? null,
    company_tier: context.company?.tier ?? null,
    contact_status: context.contact?.relationship_status ?? null,
    artist_outcomes: context.artist_total_outcomes,
    placement_score: placementScores.total,
    match_score:     matchScores.total,
    // individual factor scores stored for adaptive weight analysis
    genre_fit:      placementScores.genre_fit,
    bpm_fit:        placementScores.bpm_fit,
    mood_fit:       placementScores.mood_fit,
    territory_fit:  placementScores.territory_fit,
    artist_history: placementScores.artist_history,
    company_match:  matchScores.company_match,
    contact_match:  matchScores.contact_match,
  };

  const [prediction] = await db
    .insert(prediction_accuracy_log)
    .values({
      model_version:    MODEL_VERSION,
      prediction_type:  'placement_likelihood',
      analyzer_version: MODEL_VERSION,
      song_id:          input.song_id,
      predicted_value:  (placement_probability * 100).toFixed(2),
      predicted_label:  `${Math.round(placement_probability * 100)}% placement probability`,
      feature_vector:   featureVector,
      raw_model_output: {
        placement_score: placementScores.total,
        match_score:     matchScores.total,
        confidence,
        reasoning,
      },
      notes: `Auto-generated by analyzeOpportunity for genre=${input.genre}, territory=${input.territory}`,
    })
    .returning({ id: prediction_accuracy_log.id });

  return {
    placement_probability,
    confidence,
    reasoning,
    recommendations,
    score_breakdown: {
      placement_score: placementScores.total,
      match_score:     matchScores.total,
      genre_fit:       placementScores.genre_fit,
      bpm_fit:         placementScores.bpm_fit,
      mood_fit:        placementScores.mood_fit,
      territory_fit:   placementScores.territory_fit,
      artist_history:  placementScores.artist_history,
      company_match:   matchScores.company_match,
      contact_match:   matchScores.contact_match,
    },
    data_points_used: context.total_data_points,
    prediction_id:    prediction.id,
  };
};

import type { DnaInputForSync, SyncCategory, CategoryScore } from '../sync-intelligence/sync-intelligence.types';
import type { SyncRiskAssessment, RiskFactor, RiskStatus, RiskLevel } from './commercial-intelligence.types';

function riskFromCount(highCount: number, mediumCount: number): RiskLevel {
  if (highCount >= 2) return 'High';
  if (highCount === 1 || mediumCount >= 3) return 'Moderate';
  if (mediumCount >= 1) return 'Moderate';
  return 'Low';
}

function riskScore(factors: RiskFactor[]): number {
  const weights: Record<RiskLevel, number> = { Low: 5, Moderate: 20, High: 40, Critical: 70 };
  const raw = factors
    .filter(f => f.status === 'flag' || f.status === 'warning')
    .reduce((s, f) => s + weights[f.riskLevel], 0);
  return Math.min(100, Math.round(raw));
}

// ── Risk Factor Evaluators ────────────────────────────────────────────────────

function evaluateContentRisk(): RiskFactor {
  return {
    label: 'Explicit Content',
    status: 'unknown',
    detail: 'Explicit content status cannot be determined from audio analysis alone. Manual review required before pitching to broadcast or family-rated placement categories.',
    riskLevel: 'Low',
  };
}

function evaluateClearanceRisk(d: DnaInputForSync): RiskFactor {
  const genre = d.primaryGenre?.toLowerCase() ?? '';
  const isHighRisk = genre.includes('hip-hop') || genre.includes('trap') || genre.includes('r&b');

  if (isHighRisk) {
    return {
      label: 'Sample Clearance Risk',
      status: 'warning',
      detail: `${d.primaryGenre} tracks frequently contain uncleared samples. Verify all samples, replay elements, and interpolations are fully cleared before pitching. Uncleared samples are the most common sync deal-killer.`,
      riskLevel: 'Moderate',
    };
  }

  return {
    label: 'Sample Clearance',
    status: 'clear',
    detail: 'Genre profile suggests lower sample risk. Standard clearance verification recommended before pitch submission.',
    riskLevel: 'Low',
  };
}

function evaluateCinematicUtility(d: DnaInputForSync, categoryScores: Record<SyncCategory, CategoryScore>): RiskFactor {
  const cinematicScore = categoryScores['film_trailer'].score;
  const dramaScore = categoryScores['netflix_drama'].score;

  if (cinematicScore < 35 && dramaScore < 35) {
    return {
      label: 'Low Cinematic Utility',
      status: 'flag',
      detail: `Film trailer score (${cinematicScore}) and streaming drama score (${dramaScore}) indicate limited suitability for narrative-driven productions. This reduces total addressable market by approximately 30%.`,
      riskLevel: 'Moderate',
    };
  }

  if (cinematicScore < 50 && dramaScore < 50) {
    return {
      label: 'Limited Cinematic Range',
      status: 'warning',
      detail: 'Moderate cinematic utility — the track can serve background and transitional roles but may struggle with foreground scoring in narrative productions.',
      riskLevel: 'Low',
    };
  }

  return {
    label: 'Cinematic Utility',
    status: 'clear',
    detail: `Solid cinematic utility. Film trailer score (${cinematicScore}) and drama score (${dramaScore}) support narrative placement applications.`,
    riskLevel: 'Low',
  };
}

function evaluateGenreCompetition(d: DnaInputForSync): RiskFactor {
  const genre = d.primaryGenre?.toLowerCase() ?? '';
  const highCompetition = ['pop', 'hip-hop', 'trap', 'edm', 'dance', 'r&b'];
  const mediumCompetition = ['afrobeats', 'house', 'indie', 'electronic', 'soul'];

  const isHighComp = highCompetition.some(g => genre.includes(g));
  const isMedComp = mediumCompetition.some(g => genre.includes(g));

  if (isHighComp) {
    return {
      label: 'High Genre Competition',
      status: 'flag',
      detail: `${d.primaryGenre} is one of the most heavily licensed genres in sync. Differentiation through unique emotional profile, BPM, or production approach is essential to stand out in pitch submissions.`,
      riskLevel: 'Moderate',
    };
  }

  if (isMedComp) {
    return {
      label: 'Medium Genre Competition',
      status: 'warning',
      detail: `${d.primaryGenre} has healthy market demand but faces moderate competition. A targeted pitching strategy focused on specific buyer categories will improve conversion rates.`,
      riskLevel: 'Low',
    };
  }

  return {
    label: 'Niche Genre Positioning',
    status: 'clear',
    detail: `${d.primaryGenre} faces lower direct genre competition. The niche profile can be a differentiation advantage for the right buyer but limits broad-market appeal.`,
    riskLevel: 'Low',
  };
}

function evaluateCommercialSaturation(d: DnaInputForSync, overallScore: number): RiskFactor {
  const genre = d.primaryGenre?.toLowerCase() ?? '';
  const isSaturated = genre.includes('pop') || genre.includes('edm') || genre.includes('dance');
  const mood = d.moodPrimary?.toLowerCase() ?? '';
  const isSaturatedMood = mood === 'uplifting' || mood === 'euphoric' || mood === 'happy';

  if (isSaturated && isSaturatedMood && overallScore < 60) {
    return {
      label: 'Moderate Commercial Saturation',
      status: 'warning',
      detail: `The combination of ${d.primaryGenre} genre and ${d.moodPrimary} mood is heavily represented in sync libraries. Without a distinctive production fingerprint, this track may struggle to secure placements in the most competitive commercial categories.`,
      riskLevel: 'Moderate',
    };
  }

  return {
    label: 'Commercial Saturation',
    status: 'clear',
    detail: 'The genre and mood profile occupies a sufficiently distinctive market position within the commercial sync landscape.',
    riskLevel: 'Low',
  };
}

function evaluateBroadcastSuitability(d: DnaInputForSync): RiskFactor {
  // High aggression + high darkness can limit broadcast options
  if (d.aggression > 80 && d.darkness > 75) {
    return {
      label: 'Broadcast Restriction Risk',
      status: 'flag',
      detail: `High aggression (${d.aggression}) and darkness (${d.darkness}) may limit placement in family-friendly broadcast environments, morning programming, and certain advertising categories. Instrumental version recommended.`,
      riskLevel: 'Moderate',
    };
  }

  return {
    label: 'Broadcast Suitability',
    status: 'clear',
    detail: 'Emotional intensity profile is within acceptable parameters for standard broadcast and advertising placement.',
    riskLevel: 'Low',
  };
}

function evaluateVocalDependency(d: DnaInputForSync): RiskFactor {
  const isHighVocalGenre = ['pop', 'r&b', 'hip-hop', 'soul'].some(
    g => d.primaryGenre?.toLowerCase().includes(g)
  );

  if (isHighVocalGenre) {
    return {
      label: 'Vocal Dependency Risk',
      status: 'warning',
      detail: 'Genre profile indicates likely heavy vocal presence. Music supervisors frequently require instrumental versions for film and advertising. Provide instrumental, acapella, and stems with pitch submissions.',
      riskLevel: 'Low',
    };
  }

  return {
    label: 'Version Availability',
    status: 'unknown',
    detail: 'Ensure instrumental, clean, and stem versions are available for all pitch submissions. Music supervisors typically require multiple versions.',
    riskLevel: 'Low',
  };
}

// ── Public API ─────────────────────────────────────────────────────────────────

export function buildSyncRiskAssessment(
  d: DnaInputForSync,
  categoryScores: Record<SyncCategory, CategoryScore>,
  overallScore: number,
): SyncRiskAssessment {
  const factors: RiskFactor[] = [
    evaluateContentRisk(),
    evaluateClearanceRisk(d),
    evaluateCinematicUtility(d, categoryScores),
    evaluateGenreCompetition(d),
    evaluateCommercialSaturation(d, overallScore),
    evaluateBroadcastSuitability(d),
    evaluateVocalDependency(d),
  ];

  const flagged = factors.filter(f => f.status === 'flag');
  const warned = factors.filter(f => f.status === 'warning');

  const overallRisk = riskFromCount(
    flagged.filter(f => f.riskLevel === 'High' || f.riskLevel === 'Critical').length,
    flagged.filter(f => f.riskLevel === 'Moderate').length + warned.length,
  );

  const score = riskScore(factors);

  let recommendation: string;
  if (overallRisk === 'Low') {
    recommendation = 'Risk profile is clean. Proceed with active pitch campaign. Ensure all required deliverables (stems, instrumental, metadata) are prepared.';
  } else if (overallRisk === 'Moderate') {
    recommendation = 'Moderate risk factors identified. Address flagged items before broad-market pitching. Targeted outreach to specialist buyers is lower-risk than library mass submission.';
  } else {
    recommendation = 'High-risk factors require resolution before pitching. Prioritize clearance verification, version creation (instrumental/stems), and production refinement before engaging music supervisors.';
  }

  return { overallRisk, riskScore: score, factors, recommendation };
}

import type { DnaInputForSync, SyncCategory, CategoryScore } from '../sync-intelligence/sync-intelligence.types';
import { SYNC_CATEGORY_LABELS } from '../sync-intelligence/sync-intelligence.types';
import type {
  DatiamVerdict, CommercialOutlook, VerdictRecommendation,
  VerdictStrengthFactor, VerdictRiskFactor, VerdictRecommendedAction,
} from './commercial-intelligence.types';
import type { SyncReadinessScores } from './commercial-intelligence.types';

// ── Revenue path mapping ───────────────────────────────────────────────────────

const REVENUE_PATH: Record<SyncCategory, string> = {
  film_trailer:     'Major Studio Film Licensing',
  netflix_drama:    'Streaming Platform Licensing',
  documentary:      'Independent Film and Documentary',
  sports_content:   'Sports Media and Athlete Branding',
  gaming:           'Game Soundtrack and Esports',
  fashion:          'Fashion and Editorial Campaigns',
  luxury_brands:    'Premium Brand Advertising',
  travel_campaigns: 'Travel and Tourism Campaigns',
  commercial_ads:   'Commercial Advertising',
  social_content:   'Social Media and Creator Content',
};

// ── Audience mapping ───────────────────────────────────────────────────────────

const CATEGORY_AUDIENCE: Record<SyncCategory, string[]> = {
  film_trailer:     ['Major Studio Music Supervisors', 'Cinematic Ad Agencies'],
  netflix_drama:    ['Streaming Drama Supervisors', 'TV Production Companies'],
  documentary:      ['Independent Filmmakers', 'Documentary Streaming Divisions'],
  sports_content:   ['Sports Brands', 'Athletes', 'Fitness Content Creators'],
  gaming:           ['Game Studios', 'Esports Organizations', 'Gaming Content Creators'],
  fashion:          ['Fashion Brand Marketers', 'Editorial Creative Directors'],
  luxury_brands:    ['Luxury Automotive Brands', 'Premium Fragrance and Jewelry'],
  travel_campaigns: ['Airline and Hotel Brands', 'Tourism Boards', 'Travel Influencers'],
  commercial_ads:   ['National Advertisers', 'Digital Marketing Agencies'],
  social_content:   ['Content Creators', 'Brand Social Media Teams', 'Influencer Networks'],
};

// ── Commercial outlook ────────────────────────────────────────────────────────

function commercialOutlook(score: number): CommercialOutlook {
  if (score >= 80) return 'Exceptional';
  if (score >= 65) return 'Strong';
  if (score >= 45) return 'Moderate';
  if (score >= 25) return 'Limited';
  return 'Developing';
}

function verdictRecommendation(score: number): VerdictRecommendation {
  if (score >= 75) return 'Pitch Immediately';
  if (score >= 55) return 'Targeted Outreach';
  if (score >= 35) return 'Develop Further';
  if (score >= 20) return 'Niche Placement Only';
  return 'Not Ready';
}

function syncReadiness(score: number, topCategoryScore: number): number {
  return Math.min(100, Math.round((score * 0.6 + topCategoryScore * 0.4)));
}

function buildExecutiveSummary(
  d: { primaryGenre: string | null; moodPrimary: string | null },
  outlook: CommercialOutlook,
  topCategory: SyncCategory,
  topScore: number,
  overallScore: number,
  recommendation: VerdictRecommendation,
): string {
  const genre = d.primaryGenre ?? 'this genre';
  const mood = d.moodPrimary?.toLowerCase() ?? 'nuanced';
  const catLabel = SYNC_CATEGORY_LABELS[topCategory];

  if (outlook === 'Exceptional') {
    return `This ${genre} track demonstrates exceptional commercial sync utility with a ${mood} emotional signature that commands premium placement consideration. Strongest opportunities exist in ${catLabel} (${topScore}/100). Overall placement potential of ${overallScore}/100 positions this as an immediate priority for major sync campaign pitching.`;
  }
  if (outlook === 'Strong') {
    return `Strong commercial sync candidate. This ${genre} track with a ${mood} profile performs best in ${catLabel} placements (${topScore}/100), where its emotional architecture aligns with buyer expectations. Targeted outreach to category-specific supervisors is the recommended pathway.`;
  }
  if (outlook === 'Moderate') {
    return `Moderate commercial sync utility in a ${genre} with ${mood} characteristics. The strongest placement case is in ${catLabel} (${topScore}/100). Library submission and specialist channel pitching will outperform broad-market campaign approaches at this score profile.`;
  }
  if (outlook === 'Limited') {
    return `Limited mainstream sync appeal in current form. This ${genre} track with ${mood} qualities has best-case placement potential in ${catLabel} (${topScore}/100). Production development, remixing, or creating targeted instrumental versions is recommended before active pitching.`;
  }
  return `This ${genre} track requires further development before active sync pitching. The emotional profile needs refinement to meet minimum commercial placement thresholds. Focus on production quality, arrangement, and creating commercial-ready versions.`;
}

function confidenceScore(overallScore: number, categoryCount: number): number {
  const baseConfidence = Math.min(85, overallScore * 0.7 + 20);
  const diversityBonus = Math.min(15, categoryCount * 3);
  return Math.round(baseConfidence + diversityBonus);
}

// ── V2: Strength / Risk / Action builders ─────────────────────────────────────

function buildStrengthFactors(
  d: { triumph: number; danceability: number; brightness: number; warmth: number; spirituality: number; dropStrength: number },
  readiness: SyncReadinessScores,
): VerdictStrengthFactor[] {
  const factors: VerdictStrengthFactor[] = [];

  if (d.triumph > 65) factors.push({ label: 'High Energy', description: 'Strong triumph energy drives commercial momentum', impact: 15 });
  if (readiness.hookStrength.score > 65) factors.push({ label: 'Strong Chorus', description: 'Hook strength score indicates memorable chorus structure', impact: 12 });
  if (readiness.instrumentalValue.score > 60) factors.push({ label: 'Good Instrumental Sections', description: 'Cinematic tension creates strong underscore value', impact: 10 });
  if (d.danceability > 65) factors.push({ label: 'High Danceability', description: 'Strong rhythmic drive suits commercial and fitness campaigns', impact: 10 });
  if (d.brightness > 65) factors.push({ label: 'Brand-Safe Bright Tone', description: 'Positive, bright profile suitable for mainstream brand use', impact: 8 });
  if (d.warmth > 65) factors.push({ label: 'Warm Emotional Tone', description: 'Warmth creates strong consumer brand connection', impact: 8 });
  if (readiness.replayValue.score > 65) factors.push({ label: 'High Replay Value', description: 'Track demonstrates strong listener retention', impact: 8 });
  if (d.spirituality > 60) factors.push({ label: 'Unique Artistic Voice', description: 'Spiritual depth creates distinctive placement opportunity', impact: 6 });
  if (d.dropStrength > 65) factors.push({ label: 'Powerful Drop Structure', description: 'Strong drops create high-impact placement moments', impact: 8 });

  return factors.slice(0, 5);
}

function buildRiskFactors(
  d: { aggression: number; darkness: number; melancholy: number; volatility: number; retention: number; triumph: number; brightness: number },
  readiness: SyncReadinessScores,
): VerdictRiskFactor[] {
  const factors: VerdictRiskFactor[] = [];

  if (d.aggression > 70 && d.darkness > 65) factors.push({ label: 'Limited Brand Alignment', description: 'High aggression and darkness reduce brand campaign suitability', impact: -10 });
  if (d.volatility > 75) factors.push({ label: 'Chaotic Energy Curve', description: 'Excessive volatility disrupts sync placement edit points', impact: -8 });
  if (d.melancholy > 75) factors.push({ label: 'Narrow Emotional Appeal', description: 'Heavy melancholy limits broad commercial utility', impact: -8 });
  if (d.aggression > 80) factors.push({ label: 'Brand Safety Risk', description: 'Extreme aggression creates brand safety concerns', impact: -12 });
  if (d.darkness > 80) factors.push({ label: 'Extreme Dark Tone', description: 'Very dark profile limits mainstream commercial placements', impact: -10 });
  if (d.retention < 35) factors.push({ label: 'Low Replay Value', description: 'Low retention score indicates weak listener engagement loop', impact: -8 });
  if (readiness.hookStrength.score < 50) factors.push({ label: 'Weak First Hook', description: 'Hook strength below threshold reduces immediate commercial appeal', impact: -8 });
  if (d.triumph < 30 && d.brightness < 30) factors.push({ label: 'Low Commercial Energy', description: 'Subdued triumph and brightness limit mainstream placement potential', impact: -10 });

  return factors.slice(0, 5);
}

function buildRecommendedActions(
  overallScore: number,
  readiness: SyncReadinessScores,
  topCategory: SyncCategory,
): VerdictRecommendedAction[] {
  const actions: VerdictRecommendedAction[] = [];
  let p = 1;

  if (readiness.instrumentalValue.score > 55) {
    actions.push({ priority: p++, action: 'Create Instrumental Version', rationale: 'High instrumental value creates additional licensing tier for sync and film use' });
  }
  if (overallScore > 50) {
    actions.push({ priority: p++, action: 'Create 60-Second Edit', rationale: 'Commercial edit maximizes ad and digital placement opportunities' });
  }
  if (readiness.vocalClarity.score < 55) {
    actions.push({ priority: p++, action: 'Improve Vocal Presence', rationale: 'Strengthening vocal clarity increases placement value across emotional categories' });
  }
  if (readiness.brandSuitability.score < 50) {
    actions.push({ priority: p++, action: 'Create Brand-Safe Edit', rationale: 'Reduced aggression version opens major brand campaign opportunities' });
  }
  if (readiness.hookStrength.score < 50) {
    actions.push({ priority: p++, action: 'Strengthen Opening Hook', rationale: 'Immediate musical hook increases sync placement acceptance rate' });
  }
  if (topCategory === 'sports_content' || topCategory === 'gaming') {
    actions.push({ priority: p++, action: 'Pitch to Sports Media', rationale: 'High-energy triumph profile is ideal for sports broadcast and athlete content' });
  }
  actions.push({ priority: p++, action: 'Submit to Sync Libraries', rationale: 'Library registration maximizes passive income across all placement categories' });
  if (overallScore > 60) {
    actions.push({ priority: p++, action: 'Engage Sync Agent', rationale: 'Commercial score justifies dedicated sync representation for major placements' });
  }

  return actions.slice(0, 5);
}

// ── Public API ─────────────────────────────────────────────────────────────────

export function buildDatiamVerdict(
  d: DnaInputForSync,
  categoryScores: Record<SyncCategory, CategoryScore>,
  overallScore: number,
  readiness: SyncReadinessScores,
): DatiamVerdict {
  const ranked = (Object.entries(categoryScores) as [SyncCategory, CategoryScore][])
    .sort(([, a], [, b]) => b.score - a.score);

  const topCategory = ranked[0][0];
  const topScore = ranked[0][1].score;

  const highCategories = ranked.filter(([, cs]) => cs.score >= 50);
  const outlook = commercialOutlook(overallScore);
  const recommendation = verdictRecommendation(overallScore);
  const readinessScore = syncReadiness(overallScore, topScore);

  const bestAudience = CATEGORY_AUDIENCE[topCategory].slice(0, 3);
  const summary = buildExecutiveSummary(d, outlook, topCategory, topScore, overallScore, recommendation);

  return {
    commercialOutlook: outlook,
    bestOpportunity: SYNC_CATEGORY_LABELS[topCategory],
    bestRevenuePath: REVENUE_PATH[topCategory],
    bestAudience,
    syncReadiness: readinessScore,
    recommendation,
    executiveSummary: summary,
    confidenceScore: confidenceScore(overallScore, highCategories.length),
    strengthFactors:    buildStrengthFactors(d, readiness),
    riskFactors:        buildRiskFactors(d, readiness),
    recommendedActions: buildRecommendedActions(overallScore, readiness, topCategory),
  };
}

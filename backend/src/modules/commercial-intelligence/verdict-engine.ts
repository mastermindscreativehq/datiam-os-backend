import type { SyncCategory, CategoryScore } from '../sync-intelligence/sync-intelligence.types';
import { SYNC_CATEGORY_LABELS } from '../sync-intelligence/sync-intelligence.types';
import type { DatiamVerdict, CommercialOutlook, VerdictRecommendation } from './commercial-intelligence.types';

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

// ── Public API ─────────────────────────────────────────────────────────────────

export function buildDatiamVerdict(
  d: { primaryGenre: string | null; moodPrimary: string | null },
  categoryScores: Record<SyncCategory, CategoryScore>,
  overallScore: number,
): DatiamVerdict {
  const ranked = (Object.entries(categoryScores) as [SyncCategory, CategoryScore][])
    .sort(([, a], [, b]) => b.score - a.score);

  const topCategory = ranked[0][0];
  const topScore = ranked[0][1].score;

  const highCategories = ranked.filter(([, cs]) => cs.score >= 50);
  const outlook = commercialOutlook(overallScore);
  const recommendation = verdictRecommendation(overallScore);
  const readiness = syncReadiness(overallScore, topScore);

  const bestAudience = CATEGORY_AUDIENCE[topCategory].slice(0, 3);

  const summary = buildExecutiveSummary(d, outlook, topCategory, topScore, overallScore, recommendation);

  return {
    commercialOutlook: outlook,
    bestOpportunity: SYNC_CATEGORY_LABELS[topCategory],
    bestRevenuePath: REVENUE_PATH[topCategory],
    bestAudience,
    syncReadiness: readiness,
    recommendation,
    executiveSummary: summary,
    confidenceScore: confidenceScore(overallScore, highCategories.length),
  };
}

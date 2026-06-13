import type { SyncCategory, CategoryScore } from '../sync-intelligence/sync-intelligence.types';
import { SYNC_CATEGORY_LABELS } from '../sync-intelligence/sync-intelligence.types';
import type { DecisionEngineOutput, RecommendedAction, ImpactLevel, TimeframeLabel } from './commercial-intelligence.types';

// ── Action templates per category ─────────────────────────────────────────────

interface ActionTemplate {
  title: string;
  description: string;
  impact: ImpactLevel;
  timeframe: TimeframeLabel;
  targetAudience: string;
  channel: string;
}

const CATEGORY_ACTIONS: Record<SyncCategory, ActionTemplate> = {
  film_trailer: {
    title: 'Pitch to Film Trailer Music Supervisors',
    description: 'Submit to established trailer music companies (Two Steps From Hell, Audiomachine, Immediate Music style agencies) and in-house music supervisors at major studios. Include dramatic stems and full instrumental.',
    impact: 'High',
    timeframe: 'Immediate',
    targetAudience: 'Major studio music supervisors, trailer music agencies',
    channel: 'Direct pitch + sync agency representation',
  },
  netflix_drama: {
    title: 'Target Streaming Drama Supervisors',
    description: 'Pitch to music supervisors managing Netflix, Amazon Prime, HBO Max, and Apple TV+ drama productions. Include clean, instrumental, and stem versions. Highlight emotional storytelling utility.',
    impact: 'High',
    timeframe: 'Immediate',
    targetAudience: 'Streaming platform music supervisors, production companies',
    channel: 'Music supervisor direct outreach + sync agency',
  },
  documentary: {
    title: 'Submit to Documentary Libraries and Festivals',
    description: 'List with specialist documentary music libraries (Musicbed, Artlist, APM) and target independent documentary filmmakers. Authentic emotional character is more valuable than commercial polish in this segment.',
    impact: 'Medium',
    timeframe: 'Short-term',
    targetAudience: 'Independent documentary filmmakers, streaming documentary divisions',
    channel: 'Music libraries + festival networking',
  },
  sports_content: {
    title: 'Pitch to Sports Media and Fitness Brands',
    description: 'Target sports media networks (ESPN, Sky Sports, DAZN), professional sports teams, fitness platforms (Peloton, Nike Training Club), and athlete management companies for brand soundtrack use.',
    impact: 'High',
    timeframe: 'Immediate',
    targetAudience: 'Sports broadcasters, fitness platforms, athlete brands',
    channel: 'Direct pitch + sports marketing agencies',
  },
  gaming: {
    title: 'Pitch to Gaming Studios and Esports',
    description: 'Submit to AAA game development studios, indie game publishers, and esports event organizers. Approach gaming content creators on Twitch and YouTube for licensed background music deals.',
    impact: 'High',
    timeframe: 'Short-term',
    targetAudience: 'Game music supervisors, esports event organizers',
    channel: 'Game studio outreach + music library submission',
  },
  fashion: {
    title: 'Approach Fashion Brands and Creative Agencies',
    description: 'Pitch to fashion brand marketing teams, luxury fashion houses, and creative agencies managing runway shows and editorial campaigns. Highlight brightness and danceability for runway suitability.',
    impact: 'High',
    timeframe: 'Immediate',
    targetAudience: 'Fashion brand marketing directors, creative agencies',
    channel: 'Direct brand outreach + editorial agency pitch',
  },
  luxury_brands: {
    title: 'Target Luxury Brand Music Directors',
    description: 'Approach luxury automotive, fragrance, jewelry, and fashion brands. Premium placement requires elevated pitch presentation — focus on craft, restraint, and emotional depth over commercial appeal.',
    impact: 'High',
    timeframe: 'Short-term',
    targetAudience: 'Luxury brand marketing teams, automotive brand supervisors',
    channel: 'Agency representation + direct brand engagement',
  },
  travel_campaigns: {
    title: 'Submit to Travel and Tourism Campaigns',
    description: 'Target airline marketing teams, national tourism boards, hotel and resort brands, and travel content creators. Seasonal opportunities peak around summer travel and major holiday campaigns.',
    impact: 'Medium',
    timeframe: 'Short-term',
    targetAudience: 'Travel brand marketing teams, tourism agencies',
    channel: 'Direct brand pitch + travel content creators',
  },
  commercial_ads: {
    title: 'Pitch to Commercial Advertising Agencies',
    description: 'Submit to advertising agency music departments and brand licensing teams. National TV campaigns offer the highest per-placement rates. Consider exclusivity windows carefully in negotiations.',
    impact: 'High',
    timeframe: 'Immediate',
    targetAudience: 'Advertising agency music teams, brand campaign managers',
    channel: 'Ad agency music outreach + brand direct pitch',
  },
  social_content: {
    title: 'Leverage Social Content and Creator Partnerships',
    description: 'Partner with macro and micro influencers for organic content use. List on TikTok Sound licensing, YouTube Audio Library, and Instagram Music. Viral social use builds organic sync leverage.',
    impact: 'Medium',
    timeframe: 'Immediate',
    targetAudience: 'Content creators, social media marketing teams',
    channel: 'Influencer partnerships + platform licensing submission',
  },
};

const LIBRARY_ACTION: RecommendedAction = {
  priority: 99,
  title: 'Submit to Premium Sync Licensing Libraries',
  description: 'List on curated sync libraries — Musicbed, Artlist, Epidemic Sound (premium tier), and Pond5 Editorial. Provide full metadata, ISRC, split sheets, and all required deliverable versions.',
  impact: 'Medium',
  timeframe: 'Short-term',
  targetAudience: 'Content creators, independent filmmakers, digital marketers',
  channel: 'Music library platform submission',
};

const INSTRUMENTAL_ACTION: RecommendedAction = {
  priority: 98,
  title: 'Create and Register Instrumental Version',
  description: 'Produce clean instrumental and stem versions. Register all versions with PRO (ASCAP/BMI/SESAC) and your distribution partner. Instrumental versions unlock 30-40% more placement opportunities.',
  impact: 'High',
  timeframe: 'Immediate',
  targetAudience: 'All placement categories — required by most music supervisors',
  channel: 'Production + registration workflow',
};

// ── Strategy classification ───────────────────────────────────────────────────

type StrategyType = DecisionEngineOutput['strategyType'];

function determineStrategy(overallScore: number, topScore: number): StrategyType {
  if (overallScore >= 70 && topScore >= 75) return 'Aggressive Pitch';
  if (overallScore >= 50) return 'Targeted Pitch';
  if (overallScore >= 30) return 'Library Submission';
  return 'Development Needed';
}

// ── Public API ─────────────────────────────────────────────────────────────────

export function buildDecisionEngine(
  categoryScores: Record<SyncCategory, CategoryScore>,
  overallScore: number,
): DecisionEngineOutput {
  const ranked = (Object.entries(categoryScores) as [SyncCategory, CategoryScore][])
    .filter(([, cs]) => cs.score >= 35)
    .sort(([, a], [, b]) => b.score - a.score);

  const actions: RecommendedAction[] = [];

  // Build priority actions from top categories
  ranked.slice(0, 3).forEach(([cat, cs], idx) => {
    const template = CATEGORY_ACTIONS[cat];
    actions.push({
      priority: idx + 1,
      title: template.title,
      description: template.description,
      impact: cs.score >= 65 ? 'High' : cs.score >= 45 ? 'Medium' : 'Low',
      timeframe: template.timeframe,
      targetAudience: template.targetAudience,
      channel: template.channel,
    });
  });

  // Always add library submission if score is reasonable
  if (overallScore >= 30) {
    actions.push({ ...LIBRARY_ACTION, priority: actions.length + 1 });
  }

  // Always recommend instrumental version
  actions.push({ ...INSTRUMENTAL_ACTION, priority: actions.length + 1 });

  const topScore = ranked.length > 0 ? ranked[0][1].score : 0;
  const strategyType = determineStrategy(overallScore, topScore);

  const primaryFocus = ranked.length > 0
    ? SYNC_CATEGORY_LABELS[ranked[0][0]]
    : 'Library Development';

  return { actions, primaryFocus, strategyType };
}

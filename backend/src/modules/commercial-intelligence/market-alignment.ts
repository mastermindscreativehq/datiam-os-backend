import type { SyncCategory, CategoryScore } from '../sync-intelligence/sync-intelligence.types';
import { SYNC_CATEGORY_LABELS } from '../sync-intelligence/sync-intelligence.types';
import type { MarketAlignment, DemandLevel, CompetitionLevel, GrowthPotential } from './commercial-intelligence.types';

// ── Market Intelligence Database (2024–2025 data) ────────────────────────────

interface MarketProfile {
  demand: DemandLevel;
  competition: CompetitionLevel;
  growth: GrowthPotential;
  marketNote: string;
}

const MARKET_PROFILES: Record<SyncCategory, MarketProfile> = {
  film_trailer: {
    demand: 'High',
    competition: 'High',
    growth: 'Medium',
    marketNote: 'Stable demand from major studios and distribution houses. High competition with established sync agencies holding preferred vendor status. Budget range widening post-streaming expansion.',
  },
  netflix_drama: {
    demand: 'Very High',
    competition: 'High',
    growth: 'High',
    marketNote: 'Explosive demand driven by streaming wars across Netflix, Amazon, Apple TV+, and HBO Max. Budget allocation for music supervision has increased 40% since 2021. Diverse genre appetite is expanding placement opportunities.',
  },
  documentary: {
    demand: 'Medium',
    competition: 'Low',
    growth: 'Medium',
    marketNote: 'Steady niche demand from independent filmmakers and streaming documentary divisions. Lower competition than commercial categories. Emotional authenticity outweighs commercial profile for this segment.',
  },
  sports_content: {
    demand: 'High',
    competition: 'High',
    growth: 'High',
    marketNote: 'Driven by major sporting events, athlete branding, fitness platforms (Peloton, Nike Training), and sports media giants. Afrobeats, hip-hop, and electronic dominate. Growing demand from esports and gaming-adjacent sports content.',
  },
  gaming: {
    demand: 'High',
    competition: 'High',
    growth: 'High',
    marketNote: 'Gaming industry surpassed $200B in 2023. Music licensing for games — including trailers, in-game, and esports — is a rapidly growing segment. Electronic, metal, and hip-hop are the dominant genres.',
  },
  fashion: {
    demand: 'High',
    competition: 'High',
    growth: 'High',
    marketNote: 'Creator economy and social commerce have dramatically expanded fashion content licensing. Luxury fashion houses, fast fashion brands, and independent designers all compete for high-quality sync placement. Editorial and runway content drives premium licensing.',
  },
  luxury_brands: {
    demand: 'Medium',
    competition: 'Medium',
    growth: 'Medium',
    marketNote: 'Premium segment with selective, high-value licensing opportunities. Automotive, jewelry, and fragrance categories lead spend. Competition is curated — brand alignment and artistic credibility matter as much as sonic fit.',
  },
  travel_campaigns: {
    demand: 'Medium',
    competition: 'Medium',
    growth: 'High',
    marketNote: 'Travel and tourism recovered strongly post-pandemic. Airlines, hotel groups, and national tourism boards are active licensors. World music, folk, and upbeat pop dominate. Growing creator content demand from travel influencers.',
  },
  commercial_ads: {
    demand: 'Very High',
    competition: 'Very High',
    growth: 'Medium',
    marketNote: 'The largest single segment of sync licensing by volume. National TV, digital advertising, and social media campaigns all compete for commercial-ready tracks. Market is saturated with pop and dance tracks — genre differentiation is increasingly valuable.',
  },
  social_content: {
    demand: 'Very High',
    competition: 'Very High',
    growth: 'High',
    marketNote: 'TikTok, Instagram Reels, and YouTube Shorts have created the highest-volume, fastest-moving licensing segment. Viral potential and dance/movement appeal drive licensing decisions. License values are lower per-use but volume and brand exposure are unmatched.',
  },
};

// ── Alignment score calculation ───────────────────────────────────────────────

function computeAlignmentScore(categoryScore: number, demand: DemandLevel): number {
  const demandMultiplier: Record<DemandLevel, number> = {
    'Very High': 1.1,
    'High': 1.0,
    'Medium': 0.9,
    'Low': 0.8,
    'Niche': 0.75,
  };

  const base = categoryScore * demandMultiplier[demand];
  return Math.min(100, Math.max(0, Math.round(base)));
}

// ── Public API ─────────────────────────────────────────────────────────────────

export function buildMarketAlignment(
  categoryScores: Record<SyncCategory, CategoryScore>,
): MarketAlignment[] {
  return (Object.keys(MARKET_PROFILES) as SyncCategory[]).map(cat => {
    const profile = MARKET_PROFILES[cat];
    const categoryScore = categoryScores[cat].score;
    const alignmentScore = computeAlignmentScore(categoryScore, profile.demand);

    return {
      category: cat,
      label: SYNC_CATEGORY_LABELS[cat],
      alignmentScore,
      demand: profile.demand,
      competition: profile.competition,
      growth: profile.growth,
      marketNote: profile.marketNote,
    };
  }).sort((a, b) => b.alignmentScore - a.alignmentScore);
}

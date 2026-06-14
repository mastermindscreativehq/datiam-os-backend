import type { DnaInputForSync } from '../sync-intelligence/sync-intelligence.types';
import type { ProspectTarget, ProspectDiscovery } from './commercial-intelligence.types';

interface CompanySpec {
  name: string;
  category: string;
  type: ProspectTarget['type'];
  score: (d: DnaInputForSync) => number;
  reason: (s: number, d: DnaInputForSync) => string;
}

function w(v: number, wt: number): number { return (v / 100) * wt; }
function cap(v: number): number { return Math.min(98, Math.max(35, Math.round(v))); }

// ── Sync Targets ──────────────────────────────────────────────────────────────

const SYNC: CompanySpec[] = [
  {
    name: 'Netflix',
    category: 'Streaming Platform',
    type: 'sync',
    score: d => cap(w(d.tension, 25) + w(d.romance, 25) + w(d.melancholy, 25) + w(d.warmth, 25)),
    reason: (s) => `Streaming drama emotional profile matches Netflix tone with ${s}% alignment`,
  },
  {
    name: 'HBO / Max',
    category: 'Premium Television',
    type: 'sync',
    score: d => cap(w(d.tension, 30) + w(d.darkness, 30) + w(d.melancholy, 20) + w(d.spirituality, 20)),
    reason: () => `Dark, premium dramatic tone matches HBO's prestige content aesthetic`,
  },
  {
    name: 'Apple TV+',
    category: 'Streaming Platform',
    type: 'sync',
    score: d => cap(w(d.warmth, 30) + w(d.brightness, 30) + w(d.triumph, 20) + w(d.spirituality, 20)),
    reason: () => `Warm, optimistic quality aligns with Apple TV+ emotional signature`,
  },
  {
    name: 'Universal Pictures',
    category: 'Major Film Studio',
    type: 'sync',
    score: d => cap(w(d.triumph, 30) + w(d.tension, 30) + w(d.darkness, 20) + w(d.dropStrength, 20)),
    reason: () => `High cinematic impact energy suitable for major studio productions`,
  },
  {
    name: 'Lionsgate Films',
    category: 'Film Studio',
    type: 'sync',
    score: d => cap(w(d.tension, 30) + w(d.darkness, 35) + w(d.aggression, 20) + w(d.triumph, 15)),
    reason: () => `Dark action / thriller tone matches Lionsgate's content profile`,
  },
  {
    name: 'ESPN Films',
    category: 'Sports Documentary',
    type: 'sync',
    score: d => cap(w(d.triumph, 40) + w(d.melancholy, 30) + w(d.warmth, 30)),
    reason: () => `Triumph and emotion balance ideal for sports documentary storytelling`,
  },
  {
    name: 'Amazon Prime Video',
    category: 'Streaming Platform',
    type: 'sync',
    score: d => cap(w(d.warmth, 25) + w(d.triumph, 25) + w(d.brightness, 25) + w(d.romance, 25)),
    reason: () => `Broad, accessible emotional profile aligns with Prime Video's diverse content slate`,
  },
  {
    name: 'A24 Films',
    category: 'Independent Film Studio',
    type: 'sync',
    score: d => cap(w(d.melancholy, 30) + w(d.spirituality, 30) + w(d.tension, 25) + w(d.darkness, 15)),
    reason: () => `Artistic depth and emotional complexity ideal for A24's indie film aesthetic`,
  },
];

// ── Brand Targets ─────────────────────────────────────────────────────────────

const BRANDS: CompanySpec[] = [
  {
    name: 'Apple',
    category: 'Technology Brand',
    type: 'brand',
    score: d => cap(w(d.brightness, 35) + w(d.warmth, 30) + w(d.triumph, 20) + w(d.spirituality, 15)),
    reason: () => `Bright, innovative emotional profile matches Apple's aspirational brand identity`,
  },
  {
    name: 'Google',
    category: 'Technology Brand',
    type: 'brand',
    score: d => cap(w(d.brightness, 40) + w(d.warmth, 35) + w(d.danceability, 25)),
    reason: () => `Positive, inclusive energy aligns with Google's consumer-friendly campaigns`,
  },
  {
    name: 'Samsung',
    category: 'Consumer Electronics',
    type: 'brand',
    score: d => cap(w(d.brightness, 30) + w(d.danceability, 30) + w(d.triumph, 25) + w(d.warmth, 15)),
    reason: () => `Dynamic, energetic profile suitable for Samsung product launch campaigns`,
  },
  {
    name: 'Coca-Cola',
    category: 'Consumer Brand',
    type: 'brand',
    score: d => cap(w(d.warmth, 35) + w(d.brightness, 35) + w(d.danceability, 30)),
    reason: () => `Warm, joyful energy matches Coca-Cola's feel-good brand positioning`,
  },
  {
    name: 'Louis Vuitton',
    category: 'Luxury Fashion',
    type: 'brand',
    score: d => cap(w(d.warmth, 25) + w(d.spirituality, 30) + w(d.brightness, 20) + w(d.romance, 25)),
    reason: () => `Sophisticated, aspirational tone aligns with LV's luxury brand campaigns`,
  },
  {
    name: 'BMW',
    category: 'Luxury Automotive',
    type: 'brand',
    score: d => cap(w(d.triumph, 30) + w(d.tension, 25) + w(d.brightness, 25) + w(d.warmth, 20)),
    reason: () => `Performance-forward, premium feel matches BMW's driving emotion campaigns`,
  },
  {
    name: 'Chanel',
    category: 'Luxury Fashion House',
    type: 'brand',
    score: d => cap(w(d.romance, 35) + w(d.warmth, 30) + w(d.spirituality, 20) + w(d.brightness, 15)),
    reason: () => `Elegant, romantic profile suits Chanel's timeless brand aesthetic`,
  },
  {
    name: 'Spotify',
    category: 'Music & Streaming Brand',
    type: 'brand',
    score: d => cap(w(d.danceability, 30) + w(d.brightness, 30) + w(d.warmth, 20) + w(d.triumph, 20)),
    reason: () => `Dynamic, discoverable energy aligns with Spotify's music culture campaigns`,
  },
  {
    name: 'Airbnb',
    category: 'Lifestyle / Travel Brand',
    type: 'brand',
    score: d => cap(w(d.warmth, 35) + w(d.brightness, 25) + w(d.romance, 25) + w(d.spirituality, 15)),
    reason: () => `Warm, community-driven profile aligns with Airbnb's belonging campaigns`,
  },
  {
    name: 'Tesla',
    category: 'Automotive / Tech Brand',
    type: 'brand',
    score: d => cap(w(d.triumph, 30) + w(d.brightness, 25) + w(d.tension, 25) + w(d.spirituality, 20)),
    reason: () => `Forward-thinking, high-energy profile matches Tesla's innovation narrative`,
  },
];

// ── Creator Targets ───────────────────────────────────────────────────────────

const CREATORS: CompanySpec[] = [
  {
    name: 'MrBeast',
    category: 'YouTube Creator',
    type: 'creator',
    score: d => cap(w(d.triumph, 35) + w(d.brightness, 35) + w(d.danceability, 30)),
    reason: () => `High-energy, positive profile perfect for viral challenge and entertainment content`,
  },
  {
    name: 'MKBHD',
    category: 'Tech Content Creator',
    type: 'creator',
    score: d => cap(w(d.brightness, 40) + w(d.warmth, 30) + w(d.triumph, 30)),
    reason: () => `Clean, premium aesthetic matches tech review and product content style`,
  },
  {
    name: 'GoPro Athletes',
    category: 'Action Sports Creator',
    type: 'creator',
    score: d => cap(w(d.aggression, 30) + w(d.triumph, 35) + w(d.danceability, 20) + w(d.dropStrength, 15)),
    reason: () => `Action-oriented energy perfect for GoPro athlete and extreme sports content`,
  },
  {
    name: 'TikTok Dance Creators',
    category: 'Social Platform Creator',
    type: 'creator',
    score: d => cap(w(d.danceability, 50) + w(d.brightness, 30) + w(d.dropStrength, 20)),
    reason: () => `High danceability and catchy hook structure ideal for viral TikTok content`,
  },
  {
    name: 'Architectural Digest',
    category: 'Lifestyle / Design Creator',
    type: 'creator',
    score: d => cap(w(d.warmth, 40) + w(d.spirituality, 30) + w(d.romance, 30)),
    reason: () => `Sophisticated, ambient profile suits luxury interior design content`,
  },
  {
    name: 'Nas Daily',
    category: 'Lifestyle Creator',
    type: 'creator',
    score: d => cap(w(d.warmth, 35) + w(d.brightness, 35) + w(d.spirituality, 30)),
    reason: () => `Warm, human-interest music ideal for global storytelling content`,
  },
  {
    name: 'Red Bull Media House',
    category: 'Extreme Sports Creator',
    type: 'creator',
    score: d => cap(w(d.aggression, 30) + w(d.danceability, 25) + w(d.triumph, 25) + w(d.dropStrength, 20)),
    reason: () => `Extreme energy and drop impact aligns with Red Bull's action content library`,
  },
];

// ── Sports Targets ────────────────────────────────────────────────────────────

const SPORTS: CompanySpec[] = [
  {
    name: 'Nike',
    category: 'Sports Brand',
    type: 'sports',
    score: d => cap(w(d.triumph, 35) + w(d.aggression, 30) + w(d.danceability, 20) + w(d.brightness, 15)),
    reason: () => `High-energy motivational music profile matches Nike's 'Just Do It' campaign DNA`,
  },
  {
    name: 'Adidas',
    category: 'Sports Brand',
    type: 'sports',
    score: d => cap(w(d.triumph, 30) + w(d.warmth, 25) + w(d.danceability, 25) + w(d.brightness, 20)),
    reason: () => `Energetic yet community-driven profile aligns with Adidas brand positioning`,
  },
  {
    name: 'Under Armour',
    category: 'Performance Sports',
    type: 'sports',
    score: d => cap(w(d.aggression, 40) + w(d.triumph, 35) + w(d.tension, 25)),
    reason: () => `Intense, performance-driven energy matches Under Armour's training campaigns`,
  },
  {
    name: 'Red Bull',
    category: 'Energy / Extreme Sports',
    type: 'sports',
    score: d => cap(w(d.aggression, 30) + w(d.danceability, 25) + w(d.triumph, 25) + w(d.dropStrength, 20)),
    reason: () => `Extreme energy and drop impact aligns with Red Bull's action sports content`,
  },
  {
    name: 'NBA',
    category: 'Sports League',
    type: 'sports',
    score: d => cap(w(d.triumph, 30) + w(d.danceability, 30) + w(d.brightness, 20) + w(d.aggression, 20)),
    reason: () => `High-energy rhythmic profile ideal for NBA broadcasts and highlight reels`,
  },
  {
    name: 'NFL Films',
    category: 'Sports Media',
    type: 'sports',
    score: d => cap(w(d.triumph, 35) + w(d.tension, 30) + w(d.darkness, 20) + w(d.melancholy, 15)),
    reason: () => `Cinematic emotional depth ideal for NFL Films dramatic storytelling`,
  },
  {
    name: 'ESPN',
    category: 'Sports Media Network',
    type: 'sports',
    score: d => cap(w(d.triumph, 40) + w(d.aggression, 25) + w(d.brightness, 20) + w(d.danceability, 15)),
    reason: () => `High energy and triumph emotion suitable for ESPN broadcast and digital content`,
  },
  {
    name: 'Gatorade',
    category: 'Sports Nutrition Brand',
    type: 'sports',
    score: d => cap(w(d.triumph, 35) + w(d.danceability, 30) + w(d.brightness, 25) + w(d.warmth, 10)),
    reason: () => `Motivational, uplifting profile aligns with Gatorade's performance brand campaigns`,
  },
];

function buildTargets(specs: CompanySpec[], d: DnaInputForSync, limit = 5): ProspectTarget[] {
  return specs
    .map(spec => {
      const matchScore = spec.score(d);
      return { companyName: spec.name, category: spec.category, matchScore, reason: spec.reason(matchScore, d), type: spec.type };
    })
    .sort((a, b) => b.matchScore - a.matchScore)
    .slice(0, limit);
}

export function buildProspectDiscovery(d: DnaInputForSync): ProspectDiscovery {
  return {
    syncTargets:    buildTargets(SYNC,    d),
    brandTargets:   buildTargets(BRANDS,  d),
    creatorTargets: buildTargets(CREATORS, d),
    sportsTargets:  buildTargets(SPORTS,  d),
  };
}

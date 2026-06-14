import type { DnaInputForSync } from '../sync-intelligence/sync-intelligence.types';
import type { MarketMatch, MarketCategory } from './commercial-intelligence.types';
import { MARKET_CATEGORY_LABELS } from './commercial-intelligence.types';

function clamp(v: number): number {
  return Math.max(0, Math.min(100, Math.round(v)));
}

function w(value: number, weight: number): number {
  return (value / 100) * weight;
}

function computeAllScores(d: DnaInputForSync): Record<MarketCategory, { score: number; reasons: string[] }> {
  const r = {} as Record<MarketCategory, { score: number; reasons: string[] }>;

  // Sports Content
  {
    let s = 0; const rs: string[] = [];
    s += w(d.triumph, 30); if (d.triumph > 60) rs.push(`High triumph energy (${d.triumph}/100)`);
    s += w(d.aggression, 25); if (d.aggression > 55) rs.push(`Strong power / aggression signal`);
    s += w(d.danceability, 20); if (d.danceability > 55) rs.push(`Strong rhythmic drive`);
    s += w(d.brightness, 15);
    s += w(d.dropStrength, 10); if (d.dropStrength > 60) rs.push(`Powerful drop structure`);
    r.sports_content = { score: clamp(s), reasons: rs };
  }

  // Fitness Brands
  {
    let s = 0; const rs: string[] = [];
    s += w(d.danceability, 30); if (d.danceability > 65) rs.push(`High danceability drives workout energy`);
    s += w(d.aggression, 25); if (d.aggression > 60) rs.push(`High-energy aggressive profile`);
    s += w(d.triumph, 25); if (d.triumph > 60) rs.push(`Motivational triumph energy`);
    s += w(d.brightness, 20); if (d.brightness > 60) rs.push(`Bright energetic tone`);
    r.fitness_brands = { score: clamp(s), reasons: rs };
  }

  // Lifestyle Brands
  {
    let s = 0; const rs: string[] = [];
    s += w(d.warmth, 30); if (d.warmth > 60) rs.push(`Warm, approachable emotional tone`);
    s += w(d.brightness, 25); if (d.brightness > 60) rs.push(`Positive uplifting energy`);
    s += w(d.romance, 20); if (d.romance > 55) rs.push(`Romantic lifestyle resonance`);
    s += w(d.danceability, 15);
    const darkPenalty = Math.max(0, (d.darkness - 50) * 0.1);
    s -= darkPenalty;
    if (d.darkness > 55) rs.push(`Dark tone reduces lifestyle brand fit`);
    r.lifestyle_brands = { score: clamp(s), reasons: rs };
  }

  // Luxury Brands
  {
    let s = 0; const rs: string[] = [];
    s += w(d.warmth, 25); if (d.warmth > 60) rs.push(`Warm premium tonal quality`);
    s += w(d.spirituality, 25); if (d.spirituality > 55) rs.push(`Sophisticated spiritual depth`);
    s += w(d.brightness, 20);
    s += w(d.romance, 15); if (d.romance > 55) rs.push(`Romantic aspirational quality`);
    const aggrPenalty = Math.max(0, (d.aggression - 40) * 0.15);
    s -= aggrPenalty;
    if (d.aggression > 50) rs.push(`High aggression reduces luxury alignment`);
    r.luxury_brands = { score: clamp(s), reasons: rs };
  }

  // Fashion Brands
  {
    let s = 0; const rs: string[] = [];
    s += w(d.brightness, 30); if (d.brightness > 65) rs.push(`High brightness = editorial visual appeal`);
    s += w(d.triumph, 20);
    s += w(d.romance, 20); if (d.romance > 60) rs.push(`Romantic emotional quality`);
    s += w(d.tension, 15); if (d.tension > 50) rs.push(`Tension creates editorial drama`);
    s += w(d.danceability, 15); if (d.danceability > 60) rs.push(`Danceable energy suits runway and editorial`);
    r.fashion_brands = { score: clamp(s), reasons: rs };
  }

  // Gaming Content
  {
    let s = 0; const rs: string[] = [];
    s += w(d.tension, 30); if (d.tension > 60) rs.push(`Strong cinematic tension`);
    s += w(d.darkness, 25); if (d.darkness > 55) rs.push(`Dark atmospheric profile`);
    s += w(d.aggression, 20); if (d.aggression > 55) rs.push(`Aggressive energy = action-game fit`);
    s += w(d.triumph, 15); if (d.triumph > 55) rs.push(`Triumph energy = victory moments`);
    s += w(d.dropStrength, 10); if (d.dropStrength > 60) rs.push(`Strong drops = game impact moments`);
    r.gaming_content = { score: clamp(s), reasons: rs };
  }

  // Film & TV
  {
    let s = 0; const rs: string[] = [];
    s += w(d.tension, 25); if (d.tension > 55) rs.push(`Cinematic tension for scene scoring`);
    s += w(d.melancholy, 20); if (d.melancholy > 55) rs.push(`Emotional depth for dramatic scenes`);
    s += w(d.romance, 20); if (d.romance > 55) rs.push(`Romantic quality for narrative placement`);
    s += w(d.spirituality, 20); if (d.spirituality > 55) rs.push(`Spiritual depth for character moments`);
    s += w(d.warmth, 15);
    r.film_tv = { score: clamp(s), reasons: rs };
  }

  // Commercial Ads
  {
    let s = 0; const rs: string[] = [];
    s += w(d.brightness, 30); if (d.brightness > 65) rs.push(`High brightness = positive brand recall`);
    s += w(d.danceability, 25); if (d.danceability > 60) rs.push(`Catchy rhythm drives ad engagement`);
    s += w(d.warmth, 20); if (d.warmth > 60) rs.push(`Warm tone = consumer-friendly profile`);
    s += w(d.triumph, 15);
    const darkPenalty2 = Math.max(0, (d.darkness - 45) * 0.1);
    s -= darkPenalty2;
    if (d.darkness > 50) rs.push(`Darkness reduces ad suitability`);
    r.commercial_ads = { score: clamp(s), reasons: rs };
  }

  // Documentary
  {
    let s = 0; const rs: string[] = [];
    s += w(d.melancholy, 25); if (d.melancholy > 55) rs.push(`Melancholic depth for authentic storytelling`);
    s += w(d.spirituality, 25); if (d.spirituality > 55) rs.push(`Spiritual quality for documentary mood`);
    s += w(d.warmth, 20); if (d.warmth > 55) rs.push(`Warm tone for human-interest content`);
    s += w(d.tension, 15);
    const dancePenalty = Math.max(0, (d.danceability - 55) * 0.1);
    s -= dancePenalty;
    if (d.danceability > 60) rs.push(`High danceability reduces documentary fit`);
    r.documentary = { score: clamp(s), reasons: rs };
  }

  // Trailer Music
  {
    let s = 0; const rs: string[] = [];
    s += w(d.tension, 30); if (d.tension > 65) rs.push(`High cinematic tension`);
    s += w(d.triumph, 25); if (d.triumph > 60) rs.push(`Triumph energy for hero / reveal moments`);
    s += w(d.darkness, 20); if (d.darkness > 55) rs.push(`Dark atmosphere for dramatic impact`);
    s += w(d.dropStrength, 15); if (d.dropStrength > 60) rs.push(`Strong drops create trailer cut points`);
    s += w(d.aggression, 10);
    r.trailer_music = { score: clamp(s), reasons: rs };
  }

  return r;
}

export function buildMarketMatches(d: DnaInputForSync): MarketMatch[] {
  const computed = computeAllScores(d);
  const markets = Object.keys(computed) as MarketCategory[];

  return markets
    .map(market => ({
      market,
      score: computed[market].score,
      reasons: computed[market].reasons,
    }))
    .sort((a, b) => b.score - a.score)
    .map((m, i) => ({
      market: m.market,
      label: MARKET_CATEGORY_LABELS[m.market],
      matchScore: m.score,
      confidenceScore: Math.min(95, Math.round(m.score * 0.75 + 22)),
      ranking: i + 1,
      matchReasons: m.reasons.length > 0
        ? m.reasons.slice(0, 3)
        : [`${MARKET_CATEGORY_LABELS[m.market]} alignment: ${m.score}/100`],
    }));
}

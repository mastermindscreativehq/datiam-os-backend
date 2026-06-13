import type { DnaInputForSync, SyncCategory } from '../sync-intelligence/sync-intelligence.types';
import type { ComparableArtist } from './commercial-intelligence.types';

// ── Artist Intelligence Database ──────────────────────────────────────────────

interface ArtistProfile {
  name: string;
  genres: string[];
  emotionalProfile: Partial<Record<keyof Pick<DnaInputForSync,
    'danceability' | 'brightness' | 'warmth' | 'darkness' | 'aggression' |
    'spirituality' | 'romance' | 'triumph' | 'melancholy' | 'tension'>, number>>;
  knownPlacements: string[];
  sharedEmotionalTraits: string[];
  sharedCommercialPatterns: string[];
}

const ARTIST_DATABASE: ArtistProfile[] = [
  // ── Afrobeats / Afrofusion ────────────────────────────────────────────────
  {
    name: 'Asake',
    genres: ['afrobeats', 'afropop', 'amapiano', 'street pop'],
    emotionalProfile: { triumph: 78, brightness: 82, danceability: 88, spirituality: 65, warmth: 70 },
    knownPlacements: ['Sports Content', 'Social Content', 'Commercial Ads', 'Fashion'],
    sharedEmotionalTraits: ['euphoric', 'triumphant', 'energetic', 'uplifting'],
    sharedCommercialPatterns: ['Viral social campaigns', 'Sports brand partnerships', 'Streetwear collabs', 'National ad campaigns'],
  },
  {
    name: 'Burna Boy',
    genres: ['afrobeats', 'afrofusion', 'dancehall', 'reggae'],
    emotionalProfile: { triumph: 80, brightness: 74, danceability: 82, warmth: 76, spirituality: 70 },
    knownPlacements: ['Sports Content', 'Fashion', 'Travel Campaigns', 'Commercial Ads', 'Netflix Drama'],
    sharedEmotionalTraits: ['confident', 'triumphant', 'warm', 'soulful'],
    sharedCommercialPatterns: ['Global brand campaigns', 'Sports broadcast licensing', 'Travel and lifestyle content', 'Premium fashion brands'],
  },
  {
    name: 'Wizkid',
    genres: ['afrobeats', 'r&b', 'pop', 'afropop'],
    emotionalProfile: { romance: 78, warmth: 82, danceability: 80, brightness: 75, spirituality: 60 },
    knownPlacements: ['Fashion', 'Travel Campaigns', 'Commercial Ads', 'Social Content', 'Netflix Drama'],
    sharedEmotionalTraits: ['romantic', 'warm', 'euphoric', 'intimate'],
    sharedCommercialPatterns: ['Luxury brand collaborations', 'Lifestyle campaign music', 'Fashion film scoring', 'International ad campaigns'],
  },
  {
    name: 'Tems',
    genres: ['afrobeats', 'r&b', 'neo-soul', 'alternative'],
    emotionalProfile: { melancholy: 68, romance: 72, warmth: 78, spirituality: 75, triumph: 65 },
    knownPlacements: ['Netflix Drama', 'Fashion', 'Commercial Ads', 'Travel Campaigns'],
    sharedEmotionalTraits: ['soulful', 'melancholic', 'romantic', 'spiritual'],
    sharedCommercialPatterns: ['Streaming drama scoring', 'Fashion editorial content', 'Brand lifestyle campaigns', 'Prestige advertising'],
  },
  {
    name: 'Rema',
    genres: ['afrobeats', 'afropop', 'emo-afro'],
    emotionalProfile: { danceability: 85, brightness: 78, triumph: 72, romance: 68, tension: 55 },
    knownPlacements: ['Social Content', 'Sports Content', 'Commercial Ads', 'Fashion'],
    sharedEmotionalTraits: ['energetic', 'euphoric', 'playful', 'confident'],
    sharedCommercialPatterns: ['Viral social content', 'Youth brand campaigns', 'Sports lifestyle content', 'Global streaming campaigns'],
  },
  {
    name: 'Omah Lay',
    genres: ['afrobeats', 'r&b', 'afro-pop'],
    emotionalProfile: { romance: 80, warmth: 75, melancholy: 65, danceability: 72, brightness: 68 },
    knownPlacements: ['Netflix Drama', 'Fashion', 'Travel Campaigns', 'Social Content'],
    sharedEmotionalTraits: ['romantic', 'intimate', 'melancholic', 'warm'],
    sharedCommercialPatterns: ['Streaming series licensing', 'Fashion brand campaigns', 'Lifestyle content scoring', 'Social media partnerships'],
  },
  // ── R&B / Neo-Soul ────────────────────────────────────────────────────────
  {
    name: 'SZA',
    genres: ['r&b', 'neo-soul', 'alternative r&b', 'pop'],
    emotionalProfile: { melancholy: 78, romance: 82, warmth: 75, spirituality: 70, tension: 55 },
    knownPlacements: ['Netflix Drama', 'Fashion', 'Commercial Ads', 'Travel Campaigns'],
    sharedEmotionalTraits: ['introspective', 'romantic', 'melancholic', 'ethereal'],
    sharedCommercialPatterns: ['Streaming drama placements', 'Premium fashion campaigns', 'Luxury brand licensing', 'Award show performances'],
  },
  {
    name: 'Frank Ocean',
    genres: ['r&b', 'neo-soul', 'indie', 'alternative'],
    emotionalProfile: { melancholy: 85, romance: 78, warmth: 72, spirituality: 80, darkness: 60 },
    knownPlacements: ['Netflix Drama', 'Luxury Brands', 'Documentary', 'Fashion'],
    sharedEmotionalTraits: ['melancholic', 'introspective', 'spiritual', 'intimate'],
    sharedCommercialPatterns: ['Prestige streaming placements', 'Luxury automotive campaigns', 'Independent film scoring', 'High-fashion editorial'],
  },
  {
    name: 'Daniel Caesar',
    genres: ['r&b', 'soul', 'neo-soul', 'indie'],
    emotionalProfile: { romance: 85, warmth: 80, spirituality: 78, melancholy: 70, brightness: 65 },
    knownPlacements: ['Netflix Drama', 'Luxury Brands', 'Travel Campaigns', 'Fashion'],
    sharedEmotionalTraits: ['romantic', 'spiritual', 'warm', 'soulful'],
    sharedCommercialPatterns: ['Premium streaming licensing', 'Luxury brand scoring', 'Lifestyle campaign music', 'Wedding and event licensing'],
  },
  // ── Hip-Hop / Trap ────────────────────────────────────────────────────────
  {
    name: 'Travis Scott',
    genres: ['hip-hop', 'trap', 'psychedelic rap'],
    emotionalProfile: { aggression: 78, darkness: 72, danceability: 80, tension: 75, triumph: 70 },
    knownPlacements: ['Gaming', 'Sports Content', 'Fashion', 'Commercial Ads'],
    sharedEmotionalTraits: ['intense', 'dark', 'energetic', 'hypnotic'],
    sharedCommercialPatterns: ['Gaming franchise partnerships', 'Sneaker and streetwear collabs', 'Festival sponsorships', 'Premium gaming events'],
  },
  {
    name: 'Drake',
    genres: ['hip-hop', 'r&b', 'trap', 'pop rap'],
    emotionalProfile: { triumph: 78, melancholy: 68, danceability: 75, brightness: 70, romance: 65 },
    knownPlacements: ['Sports Content', 'Commercial Ads', 'Fashion', 'Social Content'],
    sharedEmotionalTraits: ['confident', 'melancholic', 'triumphant', 'relatable'],
    sharedCommercialPatterns: ['Sports brand partnerships', 'National ad campaigns', 'Fashion brand collaborations', 'Social media virality'],
  },
  {
    name: 'Kendrick Lamar',
    genres: ['hip-hop', 'conscious rap', 'alternative hip-hop'],
    emotionalProfile: { tension: 80, darkness: 75, triumph: 78, spirituality: 72, aggression: 75 },
    knownPlacements: ['Film Trailer', 'Documentary', 'Sports Content', 'Gaming'],
    sharedEmotionalTraits: ['intense', 'spiritual', 'triumphant', 'introspective'],
    sharedCommercialPatterns: ['Premium film licensing', 'Documentary scoring', 'Cultural brand partnerships', 'Award show and event music'],
  },
  // ── Pop ───────────────────────────────────────────────────────────────────
  {
    name: 'Billie Eilish',
    genres: ['pop', 'alternative pop', 'indie pop', 'dark pop'],
    emotionalProfile: { darkness: 75, tension: 72, melancholy: 78, romance: 60, warmth: 55 },
    knownPlacements: ['Film Trailer', 'Netflix Drama', 'Fashion', 'Gaming'],
    sharedEmotionalTraits: ['dark', 'melancholic', 'tense', 'atmospheric'],
    sharedCommercialPatterns: ['Prestige streaming licensing', 'Bond-style cinematic campaigns', 'High-fashion editorial', 'Gaming atmosphere scoring'],
  },
  {
    name: 'The Weeknd',
    genres: ['r&b', 'pop', 'dark pop', 'electropop'],
    emotionalProfile: { darkness: 72, romance: 75, tension: 68, triumph: 70, brightness: 60 },
    knownPlacements: ['Film Trailer', 'Fashion', 'Netflix Drama', 'Commercial Ads', 'Gaming'],
    sharedEmotionalTraits: ['dark', 'romantic', 'intense', 'cinematic'],
    sharedCommercialPatterns: ['Film and TV sync', 'Premium fashion campaigns', 'Global advertising', 'Gaming franchise partnerships'],
  },
  {
    name: 'Doja Cat',
    genres: ['pop', 'r&b', 'hip-hop', 'dance pop'],
    emotionalProfile: { danceability: 88, brightness: 80, triumph: 75, romance: 68, aggression: 62 },
    knownPlacements: ['Commercial Ads', 'Fashion', 'Social Content', 'Sports Content'],
    sharedEmotionalTraits: ['playful', 'confident', 'euphoric', 'energetic'],
    sharedCommercialPatterns: ['Mass-market advertising', 'Fashion brand campaigns', 'Viral social content', 'Brand collaboration partnerships'],
  },
  // ── Electronic / EDM ─────────────────────────────────────────────────────
  {
    name: 'Flume',
    genres: ['electronic', 'future bass', 'edm', 'ambient'],
    emotionalProfile: { tension: 68, brightness: 72, spirituality: 75, darkness: 60, danceability: 75 },
    knownPlacements: ['Gaming', 'Film Trailer', 'Fashion', 'Commercial Ads'],
    sharedEmotionalTraits: ['atmospheric', 'ethereal', 'energetic', 'cinematic'],
    sharedCommercialPatterns: ['Tech brand campaigns', 'Gaming soundtrack licensing', 'Fashion show scoring', 'Festival and event music'],
  },
  {
    name: 'Kygo',
    genres: ['tropical house', 'edm', 'pop', 'electronic'],
    emotionalProfile: { brightness: 85, warmth: 78, danceability: 80, triumph: 72, romance: 65 },
    knownPlacements: ['Travel Campaigns', 'Commercial Ads', 'Sports Content', 'Social Content'],
    sharedEmotionalTraits: ['uplifting', 'euphoric', 'warm', 'adventurous'],
    sharedCommercialPatterns: ['Travel and tourism campaigns', 'Summer brand advertising', 'Lifestyle content music', 'Sports event scoring'],
  },
  // ── Classical / Cinematic ─────────────────────────────────────────────────
  {
    name: 'Ludovico Einaudi',
    genres: ['classical', 'contemporary classical', 'neoclassical', 'ambient'],
    emotionalProfile: { melancholy: 78, spirituality: 82, warmth: 75, tension: 55, romance: 70 },
    knownPlacements: ['Netflix Drama', 'Documentary', 'Luxury Brands', 'Film Trailer'],
    sharedEmotionalTraits: ['contemplative', 'spiritual', 'melancholic', 'intimate'],
    sharedCommercialPatterns: ['Prestige streaming licensing', 'Documentary scoring', 'Luxury brand campaigns', 'Cinematic advertising'],
  },
  {
    name: 'Max Richter',
    genres: ['neoclassical', 'ambient', 'contemporary classical', 'cinematic'],
    emotionalProfile: { melancholy: 80, spirituality: 85, warmth: 72, tension: 60, darkness: 55 },
    knownPlacements: ['Netflix Drama', 'Documentary', 'Film Trailer', 'Luxury Brands'],
    sharedEmotionalTraits: ['contemplative', 'melancholic', 'transcendent', 'cinematic'],
    sharedCommercialPatterns: ['Prestige TV music supervision', 'Cinematic advertising', 'Documentary scoring', 'Cultural institution campaigns'],
  },
];

// ── Similarity engine ─────────────────────────────────────────────────────────

function genreSimilarity(trackGenre: string | null, artistGenres: string[]): number {
  if (!trackGenre) return 0;
  const tg = trackGenre.toLowerCase();
  for (const ag of artistGenres) {
    if (tg.includes(ag) || ag.includes(tg)) return 100;
    // Partial family match
    if (
      (tg.includes('afro') && ag.includes('afro')) ||
      (tg.includes('hip-hop') && (ag.includes('trap') || ag.includes('rap'))) ||
      (tg.includes('electronic') && (ag.includes('edm') || ag.includes('house'))) ||
      (tg.includes('r&b') && ag.includes('soul')) ||
      (tg.includes('classical') && (ag.includes('classical') || ag.includes('ambient')))
    ) return 70;
  }
  return 0;
}

function emotionalSimilarity(d: DnaInputForSync, profile: ArtistProfile['emotionalProfile']): number {
  const dims = ['danceability', 'brightness', 'warmth', 'darkness', 'aggression',
    'spirituality', 'romance', 'triumph', 'melancholy', 'tension'] as const;

  let matched = 0;
  let compared = 0;

  for (const dim of dims) {
    const trackVal = d[dim];
    const artistVal = profile[dim];
    if (artistVal === undefined || artistVal === null) continue;

    compared++;
    const diff = Math.abs(trackVal - artistVal);
    if (diff <= 15) matched += 1.0;
    else if (diff <= 25) matched += 0.7;
    else if (diff <= 35) matched += 0.4;
  }

  return compared === 0 ? 50 : Math.round((matched / compared) * 100);
}

function overallSimilarity(
  d: DnaInputForSync,
  artist: ArtistProfile,
): number {
  const gSim = genreSimilarity(d.primaryGenre, artist.genres);
  const eSim = emotionalSimilarity(d, artist.emotionalProfile);
  // Weighted: 40% genre, 60% emotional
  return Math.round(gSim * 0.40 + eSim * 0.60);
}

function buildSimilarityReason(d: DnaInputForSync, artist: ArtistProfile, sim: number): string {
  const primaryGenre = d.primaryGenre ?? 'similar genre';
  const topGenre = artist.genres[0];

  if (sim >= 85) {
    return `Near-identical genre and emotional profile — ${primaryGenre} aligns closely with ${artist.name}'s ${topGenre} signature`;
  }
  if (sim >= 70) {
    return `Strong genre family overlap (${primaryGenre} / ${topGenre}) with matching emotional dimensions`;
  }
  if (sim >= 55) {
    return `Shared emotional DNA and adjacent genre positioning suggest similar placement patterns`;
  }
  return `Moderate cross-genre emotional similarities — comparable placement categories despite genre differences`;
}

// ── Public API ─────────────────────────────────────────────────────────────────

export function buildComparableArtists(d: DnaInputForSync): ComparableArtist[] {
  const scored = ARTIST_DATABASE.map(artist => ({
    artist,
    similarity: overallSimilarity(d, artist),
  })).sort((a, b) => b.similarity - a.similarity);

  return scored.slice(0, 5).map(({ artist, similarity }) => ({
    name: artist.name,
    similarity,
    genre: artist.genres[0],
    knownPlacements: artist.knownPlacements,
    sharedEmotionalTraits: artist.sharedEmotionalTraits,
    sharedCommercialPatterns: artist.sharedCommercialPatterns,
    similarityReason: buildSimilarityReason(d, artist, similarity),
  }));
}

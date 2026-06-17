import type { AnalyzeOpportunityInput } from './intelligence.schema';
import type { HistoricalContext } from './opportunity-analyzer.service';

interface PlacementScores {
  genre_fit:      number;
  bpm_fit:        number;
  mood_fit:       number;
  territory_fit:  number;
  artist_history: number;
  total:          number;
}

// BPM sweet spots per license type — (min, ideal_min, ideal_max, max)
const BPM_RANGES: Record<string, [number, number, number, number]> = {
  film_trailer:   [80,  115, 155, 200],
  netflix_drama:  [55,   70, 110, 140],
  documentary:    [50,   65,  95, 130],
  sports_content: [100, 125, 160, 185],
  gaming:         [85,  100, 150, 175],
  fashion:        [88,  100, 120, 140],
  luxury_brand:   [60,   75, 100, 120],
  travel_campaign:[75,   90, 125, 145],
  commercial_ad:  [85,  100, 135, 160],
  social_content: [95,  110, 145, 170],
  tv_drama:       [55,   70, 110, 135],
  tv_comedy:      [88,  100, 135, 155],
  reality_tv:     [95,  110, 148, 170],
  podcast:        [55,   65,  95, 115],
  youtube:        [88,  100, 145, 175],
  music_library:  [50,   70, 145, 190],
};

// Mood → license type affinity (0-1)
const MOOD_AFFINITY: Record<string, Record<string, number>> = {
  epic:         { film_trailer: 1.0, sports_content: 0.9, gaming: 0.8, documentary: 0.5 },
  intense:      { film_trailer: 0.9, sports_content: 1.0, gaming: 0.9, commercial_ad: 0.7 },
  triumphant:   { film_trailer: 0.9, sports_content: 1.0, commercial_ad: 0.8, youtube: 0.7 },
  emotional:    { netflix_drama: 1.0, tv_drama: 0.9, documentary: 0.8, music_library: 0.7 },
  melancholic:  { netflix_drama: 0.9, tv_drama: 1.0, documentary: 0.8, music_library: 0.7 },
  bittersweet:  { netflix_drama: 1.0, tv_drama: 0.9, documentary: 0.7 },
  uplifting:    { sports_content: 0.9, commercial_ad: 0.8, travel_campaign: 0.9, youtube: 0.8 },
  inspirational:{ sports_content: 0.9, commercial_ad: 1.0, travel_campaign: 0.8, documentary: 0.7 },
  elegant:      { luxury_brand: 1.0, fashion: 0.9, travel_campaign: 0.7 },
  sophisticated:{ luxury_brand: 1.0, fashion: 0.8, netflix_drama: 0.6 },
  playful:      { tv_comedy: 1.0, reality_tv: 0.8, social_content: 0.9, youtube: 0.8 },
  energetic:    { sports_content: 0.9, gaming: 0.8, social_content: 1.0, commercial_ad: 0.8 },
  cinematic:    { film_trailer: 0.9, documentary: 0.8, netflix_drama: 0.7, gaming: 0.6 },
  dark:         { film_trailer: 0.7, gaming: 0.8, netflix_drama: 0.7, tv_drama: 0.6 },
  peaceful:     { documentary: 0.8, travel_campaign: 0.9, luxury_brand: 0.7, podcast: 0.8 },
  romantic:     { netflix_drama: 0.8, tv_drama: 0.7, fashion: 0.7, luxury_brand: 0.6 },
  nostalgic:    { documentary: 0.8, tv_drama: 0.7, netflix_drama: 0.7, music_library: 0.8 },
};

// Genre → license type natural fit (0-1)
const GENRE_LICENSE_FIT: Record<string, Record<string, number>> = {
  orchestral:    { film_trailer: 1.0, documentary: 0.9, netflix_drama: 0.8, gaming: 0.8 },
  cinematic:     { film_trailer: 1.0, documentary: 0.9, netflix_drama: 0.8, gaming: 0.7 },
  electronic:    { gaming: 0.9, sports_content: 0.8, commercial_ad: 0.8, social_content: 0.9 },
  hip_hop:       { sports_content: 0.9, commercial_ad: 0.8, social_content: 1.0, gaming: 0.8 },
  hiphop:        { sports_content: 0.9, commercial_ad: 0.8, social_content: 1.0, gaming: 0.8 },
  pop:           { commercial_ad: 0.9, social_content: 1.0, youtube: 0.9, tv_comedy: 0.8 },
  rnb:           { luxury_brand: 0.8, fashion: 0.9, social_content: 0.8, commercial_ad: 0.7 },
  jazz:          { luxury_brand: 0.9, documentary: 0.7, travel_campaign: 0.7 },
  classical:     { documentary: 0.8, luxury_brand: 0.8, film_trailer: 0.6, tv_drama: 0.7 },
  ambient:       { documentary: 0.8, gaming: 0.7, podcast: 0.9, travel_campaign: 0.8 },
  rock:          { sports_content: 0.8, gaming: 0.8, film_trailer: 0.7, commercial_ad: 0.7 },
  afrobeats:     { social_content: 0.9, commercial_ad: 0.8, sports_content: 0.7, travel_campaign: 0.7 },
  gospel:        { documentary: 0.7, tv_drama: 0.7, music_library: 0.8 },
  country:       { commercial_ad: 0.7, travel_campaign: 0.6, music_library: 0.7 },
  trap:          { sports_content: 0.8, gaming: 0.9, social_content: 0.9 },
  lofi:          { podcast: 0.8, youtube: 0.7, gaming: 0.6, social_content: 0.7 },
};

function scoreBpm(bpm: number, licenseType: string): number {
  const range = BPM_RANGES[licenseType] ?? BPM_RANGES['music_library'];
  const [min, idealMin, idealMax, max] = range;

  if (bpm >= idealMin && bpm <= idealMax) return 20;
  if (bpm < min || bpm > max) return 4;

  // Partial credit for being in outer range
  if (bpm < idealMin) {
    return 4 + Math.round(((bpm - min) / (idealMin - min)) * 12);
  }
  return 4 + Math.round(((max - bpm) / (max - idealMax)) * 12);
}

function scoreMoodFit(mood: string, licenseType: string): number {
  const moodLower = mood.toLowerCase().replace(/[- ]/g, '_');
  const affinities = MOOD_AFFINITY[moodLower];
  if (!affinities) return 8; // neutral fallback

  const match = affinities[licenseType];
  if (match === undefined) {
    // Check if any key partially matches
    const partialKey = Object.keys(MOOD_AFFINITY).find(k => moodLower.includes(k) || k.includes(moodLower));
    const partialMatch = partialKey ? (MOOD_AFFINITY[partialKey][licenseType] ?? 0.5) : 0.5;
    return Math.round(partialMatch * 15);
  }
  return Math.round(match * 15);
}

function scoreGenreFit(genre: string, licenseType: string, historicalWinRate: number): number {
  const genreLower = genre.toLowerCase().replace(/[- ]/g, '_');
  const fits = GENRE_LICENSE_FIT[genreLower];

  if (fits) {
    const catalogFit = fits[licenseType] ?? 0.5;
    const historyBonus = historicalWinRate * 0.3;
    return Math.round((catalogFit * 0.7 + historyBonus) * 25);
  }

  // Partial match
  const partialKey = Object.keys(GENRE_LICENSE_FIT).find(
    k => genreLower.includes(k) || k.includes(genreLower),
  );
  if (partialKey) {
    const fit = GENRE_LICENSE_FIT[partialKey][licenseType] ?? 0.5;
    return Math.round(fit * 20);
  }

  // No genre data — use history alone
  return Math.round((historicalWinRate * 0.4 + 0.3) * 25);
}

export const calculatePlacementScore = (
  input: AnalyzeOpportunityInput,
  context: HistoricalContext,
): PlacementScores => {
  const licenseType = input.license_type ?? 'music_library';

  const genre_fit      = scoreGenreFit(input.genre, licenseType, context.genre_win_rate);
  const bpm_fit        = scoreBpm(input.bpm, licenseType);
  const mood_fit       = scoreMoodFit(input.mood, licenseType);

  // Territory score: scale historical win rate to 0-15
  const baseTerritory  = context.territory_total_outcomes > 0
    ? context.territory_win_rate
    : 0.15;
  const territory_fit  = Math.round(baseTerritory * 15);

  // Artist history score: scale win rate to 0-25, with a floor for new artists
  const artistBase = context.artist_total_outcomes > 0
    ? context.artist_win_rate
    : 0.15;
  const artist_history = Math.round(artistBase * 25);

  const total = genre_fit + bpm_fit + mood_fit + territory_fit + artist_history;

  return {
    genre_fit,
    bpm_fit,
    mood_fit,
    territory_fit,
    artist_history,
    total: Math.min(100, total),
  };
};

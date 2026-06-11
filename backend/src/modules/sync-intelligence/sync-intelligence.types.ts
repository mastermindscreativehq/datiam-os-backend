export const SYNC_ANALYZER_VERSION = '1.0.0';

// ── Sync Category Definitions ─────────────────────────────────────────────────

export const SYNC_CATEGORIES = [
  'film_trailer',
  'netflix_drama',
  'documentary',
  'sports_content',
  'gaming',
  'fashion',
  'luxury_brands',
  'travel_campaigns',
  'commercial_ads',
  'social_content',
] as const;

export type SyncCategory = typeof SYNC_CATEGORIES[number];

export const SYNC_CATEGORY_LABELS: Record<SyncCategory, string> = {
  film_trailer:     'Film Trailer',
  netflix_drama:    'Netflix / Streaming Drama',
  documentary:      'Documentary',
  sports_content:   'Sports Content',
  gaming:           'Gaming',
  fashion:          'Fashion',
  luxury_brands:    'Luxury Brands',
  travel_campaigns: 'Travel Campaigns',
  commercial_ads:   'Commercial Ads',
  social_content:   'Social Content',
};

// ── Score Profile ─────────────────────────────────────────────────────────────

export interface CategoryScore {
  category:   SyncCategory;
  label:      string;
  score:      number;  // 0–100 suitability
  confidence: number;  // 0–100 certainty
  rationale:  string;  // short human-readable reason
}

export interface SyncScoreResult {
  scores:           Record<SyncCategory, CategoryScore>;
  topCategories:    SyncCategory[];          // ranked, best first
  syncTags:         string[];
  placementNotes:   string;
  overallSyncScore: number;
  processingTimeMs: number;
}

// ── DNA Input Contract ────────────────────────────────────────────────────────

export interface DnaInputForSync {
  primaryGenre:   string;
  secondaryGenre: string | null;
  moodPrimary:    string;
  moodSecondary:  string | null;

  danceability: number;
  brightness:   number;
  warmth:       number;
  darkness:     number;
  aggression:   number;
  spirituality: number;
  romance:      number;
  triumph:      number;
  melancholy:   number;
  tension:      number;

  // From energy analysis (optional enrichment)
  energyArc:    string | null;
  dropStrength: number;
  volatility:   number;
  retention:    number;
}

// ── Sync Tag Taxonomy ─────────────────────────────────────────────────────────

export const SYNC_TAGS = {
  cinematic:      'Cinematic',
  anthemic:       'Anthemic',
  atmospheric:    'Atmospheric',
  emotional:      'Emotional',
  energetic:      'Energetic',
  epicBuild:      'Epic Build',
  luxury:         'Luxury',
  uplifting:      'Uplifting',
  dark:           'Dark Atmosphere',
  tension:        'High Tension',
  groovy:         'Groovy',
  romantic:       'Romantic',
  inspirational:  'Inspirational',
  worldly:        'Worldly',
  editorial:      'Editorial',
  hypnotic:       'Hypnotic',
  punchy:         'Punchy',
  urban:          'Urban',
  euphoric:       'Euphoric',
  intimate:       'Intimate',
} as const;

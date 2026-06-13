import type { DnaInputForSync, SyncCategory, CategoryScore } from '../../sync-intelligence/sync-intelligence.types';
import { SYNC_CATEGORIES, SYNC_CATEGORY_LABELS } from '../../sync-intelligence/sync-intelligence.types';

/** Afrobeats baseline — strong triumph/brightness/danceability. */
export const baseDna: DnaInputForSync = {
  primaryGenre:   'afrobeats',
  secondaryGenre: 'r&b',
  moodPrimary:    'euphoric',
  moodSecondary:  null,
  danceability:   82,
  brightness:     78,
  warmth:         72,
  darkness:       30,
  aggression:     45,
  spirituality:   60,
  romance:        55,
  triumph:        75,
  melancholy:     35,
  tension:        40,
  energyArc:      'rising',
  dropStrength:   65,
  volatility:     55,
  retention:      70,
};

/** High-tension cinematic DNA — ideal for film trailer positive factors. */
export const cinematicDna: DnaInputForSync = {
  primaryGenre:   'cinematic',
  secondaryGenre: 'orchestral',
  moodPrimary:    'tense',
  moodSecondary:  null,
  danceability:   30,
  brightness:     45,
  warmth:         40,
  darkness:       70,
  aggression:     70,
  spirituality:   50,
  romance:        30,
  triumph:        75,
  melancholy:     50,
  tension:        80,
  energyArc:      'rising',
  dropStrength:   80,
  volatility:     60,
  retention:      55,
};

/** Low-energy ambient DNA — produces negative factors across most categories. */
export const lowDna: DnaInputForSync = {
  primaryGenre:   'ambient',
  secondaryGenre: null,
  moodPrimary:    'peaceful',
  moodSecondary:  null,
  danceability:   25,
  brightness:     30,
  warmth:         55,
  darkness:       20,
  aggression:     15,
  spirituality:   65,
  romance:        30,
  triumph:        30,
  melancholy:     45,
  tension:        25,
  energyArc:      'falling',
  dropStrength:   20,
  volatility:     25,
  retention:      45,
};

/** High-risk DNA: pop genre, uplifting mood, extreme aggression+darkness. */
export const riskDna: DnaInputForSync = {
  primaryGenre:   'pop',
  secondaryGenre: null,
  moodPrimary:    'uplifting',
  moodSecondary:  null,
  danceability:   70,
  brightness:     65,
  warmth:         50,
  darkness:       78,
  aggression:     85,
  spirituality:   20,
  romance:        40,
  triumph:        55,
  melancholy:     30,
  tension:        50,
  energyArc:      'steady',
  dropStrength:   55,
  volatility:     70,
  retention:      60,
};

/**
 * Build a complete CategoryScore record for all 10 sync categories.
 * Default: score=50, confidence=70. Pass overrides per category.
 */
export function makeScores(
  overrides: Partial<Record<SyncCategory, { score?: number; confidence?: number }>> = {},
): Record<SyncCategory, CategoryScore> {
  const result = {} as Record<SyncCategory, CategoryScore>;
  for (const cat of SYNC_CATEGORIES) {
    const ov = overrides[cat] ?? {};
    result[cat] = {
      category:   cat,
      label:      SYNC_CATEGORY_LABELS[cat],
      score:      ov.score      ?? 50,
      confidence: ov.confidence ?? 70,
      rationale:  'test fixture',
    };
  }
  return result;
}

export function makeZeroScores(): Record<SyncCategory, CategoryScore> {
  return makeScores(
    Object.fromEntries(
      SYNC_CATEGORIES.map(c => [c, { score: 0, confidence: 0 }]),
    ) as Partial<Record<SyncCategory, { score?: number; confidence?: number }>>,
  );
}

export function makeMaxScores(): Record<SyncCategory, CategoryScore> {
  return makeScores(
    Object.fromEntries(
      SYNC_CATEGORIES.map(c => [c, { score: 100, confidence: 95 }]),
    ) as Partial<Record<SyncCategory, { score?: number; confidence?: number }>>,
  );
}

/** A realistic sync_intelligence DB row (all numeric fields as strings, as Postgres returns them). */
export function makeSiRow(uploadId = 'upload-abc', artistId = 'artist-xyz') {
  return {
    upload_id:   uploadId,
    artist_id:   artistId,
    created_at:  new Date('2025-01-01'),
    film_trailer:           '65', film_trailer_confidence:  '75',
    netflix_drama:          '50', netflix_drama_confidence: '70',
    documentary:            '40', documentary_confidence:   '65',
    sports_content:         '60', sports_content_confidence:'72',
    gaming:                 '48', gaming_confidence:        '68',
    fashion:                '45', fashion_confidence:       '60',
    luxury_brands:          '38', luxury_brands_confidence: '55',
    travel_campaigns:       '42', travel_confidence:        '62',
    commercial_ads:         '58', commercial_confidence:    '73',
    social_content:         '52', social_confidence:        '69',
    overall_sync_score:     '52',
    top_categories:         ['film_trailer', 'sports_content', 'commercial_ads'],
  };
}

/** A realistic audio_dna DB row. */
export function makeDnaRow(uploadId = 'upload-abc') {
  return {
    upload_id:       uploadId,
    primary_genre:   'afrobeats',
    secondary_genre: 'r&b',
    mood_primary:    'euphoric',
    mood_secondary:  null,
    danceability:    '82',
    brightness:      '78',
    warmth:          '72',
    darkness:        '30',
    aggression:      '45',
    spirituality:    '60',
    romance:         '55',
    triumph:         '75',
    melancholy:      '35',
    tension:         '40',
  };
}

/** A realistic energy_analysis DB row. */
export function makeEnergyRow(uploadId = 'upload-abc') {
  return {
    upload_id:         uploadId,
    energy_arc:        'rising',
    drop_strength:     '65',
    energy_volatility: '55',
    replay_retention:  '70',
  };
}

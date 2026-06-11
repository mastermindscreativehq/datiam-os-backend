import {
  SYNC_CATEGORIES,
  SYNC_CATEGORY_LABELS,
  type SyncCategory,
  type CategoryScore,
  type SyncScoreResult,
  type DnaInputForSync,
  SYNC_TAGS,
} from './sync-intelligence.types';

// ── Utilities ─────────────────────────────────────────────────────────────────

function clamp(v: number, lo = 0, hi = 100): number {
  return Math.max(lo, Math.min(hi, Math.round(v)));
}

function weightedSum(pairs: Array<[value: number, weight: number]>): number {
  const totalWeight = pairs.reduce((s, [, w]) => s + w, 0);
  const raw = pairs.reduce((s, [v, w]) => s + v * w, 0);
  return raw / (totalWeight || 1);
}

function genreBonus(genre: string | null, targets: string[], magnitude = 15): number {
  if (!genre) return 0;
  return targets.some(t => genre.toLowerCase().includes(t.toLowerCase())) ? magnitude : 0;
}

function moodBonus(mood: string | null, targets: string[], magnitude = 12): number {
  if (!mood) return 0;
  return targets.some(t => mood.toLowerCase().includes(t.toLowerCase())) ? magnitude : 0;
}

function confidenceFromSignals(strongSignals: boolean[], weakSignals: boolean[]): number {
  const strong = strongSignals.filter(Boolean).length;
  const weak   = weakSignals.filter(Boolean).length;
  const total  = strongSignals.length + weakSignals.length;
  return clamp((strong * 20 + weak * 8) / (total * 20) * 100);
}

// ── Per-category scorers ──────────────────────────────────────────────────────

function scoreFilmTrailer(d: DnaInputForSync): CategoryScore {
  const raw = weightedSum([
    [d.tension,     0.25],
    [d.aggression,  0.20],
    [d.triumph,     0.20],
    [d.darkness,    0.15],
    [d.brightness,  0.10],
    [d.danceability, 0.10],
  ]);

  const gBonus = genreBonus(d.primaryGenre, ['cinematic', 'orchestral', 'metal', 'electronic', 'rock'], 18)
               + genreBonus(d.secondaryGenre, ['cinematic', 'orchestral', 'ambient'], 8);
  const mBonus = moodBonus(d.moodPrimary, ['tense', 'triumphant', 'aggressive', 'cinematic', 'dark'], 14);
  const arcBonus = (d.energyArc === 'rising' || d.energyArc === 'peak') ? 12 : 0;
  const dropBonus = d.dropStrength > 70 ? 10 : 0;

  const score = clamp(raw * 0.65 + gBonus + mBonus + arcBonus + dropBonus);
  const confidence = confidenceFromSignals(
    [d.tension > 65, d.triumph > 65, d.aggression > 60, d.energyArc === 'rising'],
    [d.darkness > 50, d.dropStrength > 55, mBonus > 0],
  );

  return {
    category:  'film_trailer',
    label:     SYNC_CATEGORY_LABELS['film_trailer'],
    score,
    confidence,
    rationale: `Tension ${d.tension} · Triumph ${d.triumph} · Drop impact ${d.dropStrength}`,
  };
}

function scoreNetflixDrama(d: DnaInputForSync): CategoryScore {
  const raw = weightedSum([
    [d.melancholy,   0.22],
    [d.romance,      0.20],
    [d.warmth,       0.18],
    [d.darkness,     0.15],
    [d.spirituality, 0.13],
    [d.tension,      0.12],
  ]);

  const gBonus = genreBonus(d.primaryGenre, ['soul', 'r&b', 'cinematic', 'indie', 'alternative', 'neo-soul', 'jazz'], 15)
               + genreBonus(d.secondaryGenre, ['soul', 'cinematic', 'jazz'], 6);
  const mBonus = moodBonus(d.moodPrimary, ['melancholic', 'romantic', 'mysterious', 'dark', 'nostalgic', 'dreamy'], 12);
  const retBonus = d.retention > 65 ? 8 : 0;

  const score = clamp(raw * 0.65 + gBonus + mBonus + retBonus);
  const confidence = confidenceFromSignals(
    [d.melancholy > 60, d.romance > 55, d.warmth > 55],
    [d.spirituality > 45, d.darkness > 40, mBonus > 0],
  );

  return {
    category:  'netflix_drama',
    label:     SYNC_CATEGORY_LABELS['netflix_drama'],
    score,
    confidence,
    rationale: `Melancholy ${d.melancholy} · Romance ${d.romance} · Warmth ${d.warmth}`,
  };
}

function scoreDocumentary(d: DnaInputForSync): CategoryScore {
  const raw = weightedSum([
    [d.spirituality,           0.22],
    [d.warmth,                 0.18],
    [(100 - d.aggression),     0.18],
    [d.melancholy,             0.15],
    [(100 - d.danceability),   0.15],
    [d.darkness,               0.12],
  ]);

  const gBonus = genreBonus(d.primaryGenre, ['ambient', 'classical', 'folk', 'world music', 'orchestral', 'cinematic', 'jazz'], 14)
               + genreBonus(d.secondaryGenre, ['ambient', 'folk', 'world', 'classical'], 6);
  const mBonus = moodBonus(d.moodPrimary, ['peaceful', 'spiritual', 'mysterious', 'melancholic', 'dreamy', 'nostalgic'], 11);

  const score = clamp(raw * 0.70 + gBonus + mBonus);
  const confidence = confidenceFromSignals(
    [d.spirituality > 55, d.aggression < 35, d.danceability < 50],
    [d.warmth > 50, d.melancholy > 40, mBonus > 0],
  );

  return {
    category:  'documentary',
    label:     SYNC_CATEGORY_LABELS['documentary'],
    score,
    confidence,
    rationale: `Spirituality ${d.spirituality} · Low aggression ${100 - d.aggression} · Warmth ${d.warmth}`,
  };
}

function scoreSportsContent(d: DnaInputForSync): CategoryScore {
  const raw = weightedSum([
    [d.danceability, 0.25],
    [d.aggression,   0.25],
    [d.triumph,      0.22],
    [d.brightness,   0.15],
    [d.tension,      0.13],
  ]);

  const gBonus = genreBonus(d.primaryGenre, ['hip-hop', 'trap', 'metal', 'rock', 'dance', 'edm', 'drum & bass', 'punk'], 18)
               + genreBonus(d.secondaryGenre, ['hip-hop', 'rock', 'metal', 'trap'], 8);
  const mBonus = moodBonus(d.moodPrimary, ['triumphant', 'aggressive', 'confident', 'euphoric', 'uplifting'], 13);
  const arcBonus = d.energyArc === 'rising' ? 10 : d.energyArc === 'steady' ? 5 : 0;
  const dropBonus = d.dropStrength > 65 ? 8 : 0;

  const score = clamp(raw * 0.60 + gBonus + mBonus + arcBonus + dropBonus);
  const confidence = confidenceFromSignals(
    [d.aggression > 65, d.triumph > 65, d.danceability > 60],
    [d.brightness > 55, d.dropStrength > 55, mBonus > 0],
  );

  return {
    category:  'sports_content',
    label:     SYNC_CATEGORY_LABELS['sports_content'],
    score,
    confidence,
    rationale: `Aggression ${d.aggression} · Triumph ${d.triumph} · Danceability ${d.danceability}`,
  };
}

function scoreGaming(d: DnaInputForSync): CategoryScore {
  const raw = weightedSum([
    [d.tension,      0.23],
    [d.aggression,   0.22],
    [d.darkness,     0.20],
    [d.danceability, 0.18],
    [d.triumph,      0.17],
  ]);

  const gBonus = genreBonus(d.primaryGenre, ['electronic', 'edm', 'metal', 'drum & bass', 'techno', 'dubstep', 'trap'], 18)
               + genreBonus(d.secondaryGenre, ['electronic', 'metal', 'drum & bass', 'techno'], 8);
  const mBonus = moodBonus(d.moodPrimary, ['tense', 'aggressive', 'dark', 'triumphant', 'mysterious', 'euphoric'], 12);
  const volBonus = d.volatility > 65 ? 8 : 0;

  const score = clamp(raw * 0.62 + gBonus + mBonus + volBonus);
  const confidence = confidenceFromSignals(
    [d.tension > 60, d.aggression > 60, d.darkness > 55],
    [d.danceability > 50, d.volatility > 55, mBonus > 0],
  );

  return {
    category:  'gaming',
    label:     SYNC_CATEGORY_LABELS['gaming'],
    score,
    confidence,
    rationale: `Tension ${d.tension} · Aggression ${d.aggression} · Darkness ${d.darkness}`,
  };
}

function scoreFashion(d: DnaInputForSync): CategoryScore {
  const raw = weightedSum([
    [d.brightness,   0.25],
    [d.danceability, 0.22],
    [d.romance,      0.20],
    [d.triumph,      0.18],
    [(100 - d.darkness), 0.15],
  ]);

  const gBonus = genreBonus(d.primaryGenre, ['pop', 'dance', 'edm', 'house', 'r&b', 'electronic'], 16)
               + genreBonus(d.secondaryGenre, ['pop', 'house', 'r&b', 'electronic'], 7);
  const mBonus = moodBonus(d.moodPrimary, ['confident', 'euphoric', 'romantic', 'playful', 'uplifting'], 12);

  const score = clamp(raw * 0.65 + gBonus + mBonus);
  const confidence = confidenceFromSignals(
    [d.brightness > 60, d.danceability > 60, d.romance > 50],
    [d.triumph > 50, d.aggression < 55, mBonus > 0],
  );

  return {
    category:  'fashion',
    label:     SYNC_CATEGORY_LABELS['fashion'],
    score,
    confidence,
    rationale: `Brightness ${d.brightness} · Danceability ${d.danceability} · Romance ${d.romance}`,
  };
}

function scoreLuxuryBrands(d: DnaInputForSync): CategoryScore {
  const raw = weightedSum([
    [d.warmth,               0.25],
    [d.romance,              0.22],
    [d.spirituality,         0.18],
    [(100 - d.aggression),   0.18],
    [(100 - d.danceability), 0.17],
  ]);

  const gBonus = genreBonus(d.primaryGenre, ['classical', 'orchestral', 'jazz', 'ambient', 'neo-soul', 'soul', 'cinematic'], 16)
               + genreBonus(d.secondaryGenre, ['classical', 'jazz', 'orchestral', 'ambient'], 7);
  const mBonus = moodBonus(d.moodPrimary, ['romantic', 'spiritual', 'peaceful', 'mysterious', 'nostalgic', 'dreamy'], 12);
  const lowTensionBonus = d.tension < 40 ? 10 : d.tension < 55 ? 5 : 0;

  const score = clamp(raw * 0.65 + gBonus + mBonus + lowTensionBonus);
  const confidence = confidenceFromSignals(
    [d.warmth > 60, d.aggression < 35, d.danceability < 45],
    [d.romance > 50, d.spirituality > 45, mBonus > 0],
  );

  return {
    category:  'luxury_brands',
    label:     SYNC_CATEGORY_LABELS['luxury_brands'],
    score,
    confidence,
    rationale: `Warmth ${d.warmth} · Low aggression ${100 - d.aggression} · Romance ${d.romance}`,
  };
}

function scoreTravelCampaigns(d: DnaInputForSync): CategoryScore {
  const raw = weightedSum([
    [d.brightness,   0.22],
    [d.spirituality, 0.20],
    [d.warmth,       0.20],
    [d.danceability, 0.18],
    [d.triumph,      0.20],
  ]);

  const gBonus = genreBonus(d.primaryGenre, ['folk', 'world music', 'afrobeats', 'reggae', 'latin', 'pop', 'indie', 'country'], 16)
               + genreBonus(d.secondaryGenre, ['folk', 'world music', 'afrobeats', 'latin', 'reggae'], 7);
  const mBonus = moodBonus(d.moodPrimary, ['euphoric', 'uplifting', 'peaceful', 'triumphant', 'playful', 'dreamy'], 12);
  const retBonus = d.retention > 60 ? 7 : 0;

  const score = clamp(raw * 0.65 + gBonus + mBonus + retBonus);
  const confidence = confidenceFromSignals(
    [d.brightness > 60, d.spirituality > 55, d.warmth > 55],
    [d.triumph > 50, d.danceability > 45, mBonus > 0],
  );

  return {
    category:  'travel_campaigns',
    label:     SYNC_CATEGORY_LABELS['travel_campaigns'],
    score,
    confidence,
    rationale: `Brightness ${d.brightness} · Spirituality ${d.spirituality} · Warmth ${d.warmth}`,
  };
}

function scoreCommercialAds(d: DnaInputForSync): CategoryScore {
  const raw = weightedSum([
    [d.danceability, 0.25],
    [d.brightness,   0.22],
    [d.triumph,      0.20],
    [d.romance,      0.18],
    [(100 - d.tension), 0.15],
  ]);

  const gBonus = genreBonus(d.primaryGenre, ['pop', 'dance', 'edm', 'house', 'r&b', 'soul', 'hip-hop'], 16)
               + genreBonus(d.secondaryGenre, ['pop', 'house', 'r&b', 'soul'], 7);
  const mBonus = moodBonus(d.moodPrimary, ['uplifting', 'playful', 'confident', 'euphoric', 'romantic'], 12);
  const retBonus = d.retention > 65 ? 8 : 0;

  const score = clamp(raw * 0.65 + gBonus + mBonus + retBonus);
  const confidence = confidenceFromSignals(
    [d.danceability > 60, d.brightness > 55, d.triumph > 55],
    [d.tension < 50, d.retention > 55, mBonus > 0],
  );

  return {
    category:  'commercial_ads',
    label:     SYNC_CATEGORY_LABELS['commercial_ads'],
    score,
    confidence,
    rationale: `Danceability ${d.danceability} · Brightness ${d.brightness} · Triumph ${d.triumph}`,
  };
}

function scoreSocialContent(d: DnaInputForSync): CategoryScore {
  const raw = weightedSum([
    [d.danceability, 0.30],
    [d.brightness,   0.22],
    [d.triumph,      0.18],
    [d.aggression,   0.15],
    [d.tension,      0.15],
  ]);

  const gBonus = genreBonus(d.primaryGenre, ['hip-hop', 'trap', 'pop', 'dance', 'edm', 'afrobeats', 'r&b', 'lo-fi'], 18)
               + genreBonus(d.secondaryGenre, ['hip-hop', 'trap', 'pop', 'afrobeats'], 8);
  const mBonus = moodBonus(d.moodPrimary, ['euphoric', 'playful', 'confident', 'uplifting', 'aggressive', 'triumphant'], 13);
  const dropBonus = d.dropStrength > 60 ? 8 : 0;
  const volBonus  = d.volatility  > 60 ? 5 : 0;

  const score = clamp(raw * 0.60 + gBonus + mBonus + dropBonus + volBonus);
  const confidence = confidenceFromSignals(
    [d.danceability > 65, d.brightness > 60, d.aggression > 55],
    [d.dropStrength > 55, d.volatility > 55, mBonus > 0],
  );

  return {
    category:  'social_content',
    label:     SYNC_CATEGORY_LABELS['social_content'],
    score,
    confidence,
    rationale: `Danceability ${d.danceability} · Brightness ${d.brightness} · Energy drop ${d.dropStrength}`,
  };
}

// ── Tag builder ───────────────────────────────────────────────────────────────

function buildSyncTags(d: DnaInputForSync, scores: Record<SyncCategory, CategoryScore>): string[] {
  const tags: string[] = [];

  if (d.tension      > 70) tags.push(SYNC_TAGS.tension);
  if (d.triumph      > 70) tags.push(SYNC_TAGS.anthemic);
  if (d.brightness   > 65) tags.push(SYNC_TAGS.uplifting);
  if (d.darkness     > 65) tags.push(SYNC_TAGS.dark);
  if (d.warmth       > 65) tags.push(SYNC_TAGS.intimate);
  if (d.aggression   > 70) tags.push(SYNC_TAGS.energetic);
  if (d.romance      > 65) tags.push(SYNC_TAGS.romantic);
  if (d.spirituality > 65) tags.push(SYNC_TAGS.atmospheric);
  if (d.danceability > 70) tags.push(SYNC_TAGS.groovy);
  if (d.melancholy   > 65) tags.push(SYNC_TAGS.emotional);
  if (d.dropStrength > 70) tags.push(SYNC_TAGS.punchy);
  if (d.volatility   > 70) tags.push(SYNC_TAGS.epicBuild);

  if (scores['film_trailer'].score   > 70) tags.push(SYNC_TAGS.cinematic);
  if (scores['luxury_brands'].score  > 65) tags.push(SYNC_TAGS.luxury);
  if (scores['travel_campaigns'].score > 65) tags.push(SYNC_TAGS.worldly);
  if (scores['fashion'].score        > 65) tags.push(SYNC_TAGS.editorial);
  if (scores['gaming'].score         > 65) tags.push(SYNC_TAGS.hypnotic);
  if (d.danceability > 65 && d.aggression > 60) tags.push(SYNC_TAGS.urban);
  if (scores['travel_campaigns'].score > 70 && d.spirituality > 55) tags.push(SYNC_TAGS.inspirational);
  if (d.triumph > 70 && d.brightness > 65) tags.push(SYNC_TAGS.euphoric);

  return [...new Set(tags)];
}

// ── Placement notes generator ─────────────────────────────────────────────────

function generatePlacementNotes(
  d: DnaInputForSync,
  topCategories: SyncCategory[],
  overallScore: number,
): string {
  const top = topCategories.slice(0, 3).map(c => SYNC_CATEGORY_LABELS[c]).join(', ');
  const mood = d.moodPrimary;
  const genre = d.primaryGenre;

  if (overallScore >= 80) {
    return `Highly versatile sync candidate. This ${genre} track with its ${mood.toLowerCase()} quality is exceptionally well-suited for ${top}. Strong commercial potential across multiple placement types.`;
  } else if (overallScore >= 65) {
    return `Solid sync potential. This ${genre} track with ${mood.toLowerCase()} characteristics excels in ${top} contexts. Recommended for targeted pitch campaigns.`;
  } else if (overallScore >= 50) {
    return `Niche sync fit. Best suited for ${top}. The ${mood.toLowerCase()} mood and ${genre} genre profile limits broad placement but creates strong resonance in specialist contexts.`;
  } else {
    return `Limited mainstream sync appeal. This ${genre} track with ${mood.toLowerCase()} qualities may suit boutique or artistic placement opportunities in ${top}.`;
  }
}

// ── Main compute function ─────────────────────────────────────────────────────

export function computeSyncIntelligence(d: DnaInputForSync): SyncScoreResult {
  const startMs = Date.now();

  const scoreFns: Record<SyncCategory, (d: DnaInputForSync) => CategoryScore> = {
    film_trailer:     scoreFilmTrailer,
    netflix_drama:    scoreNetflixDrama,
    documentary:      scoreDocumentary,
    sports_content:   scoreSportsContent,
    gaming:           scoreGaming,
    fashion:          scoreFashion,
    luxury_brands:    scoreLuxuryBrands,
    travel_campaigns: scoreTravelCampaigns,
    commercial_ads:   scoreCommercialAds,
    social_content:   scoreSocialContent,
  };

  const scores = {} as Record<SyncCategory, CategoryScore>;
  for (const cat of SYNC_CATEGORIES) {
    scores[cat] = scoreFns[cat](d);
  }

  const topCategories = ([...SYNC_CATEGORIES] as SyncCategory[])
    .sort((a, b) => scores[b].score - scores[a].score)
    .filter(c => scores[c].score >= 40);

  const overallSyncScore = clamp(
    SYNC_CATEGORIES.reduce((s, c) => s + scores[c].score, 0) / SYNC_CATEGORIES.length,
  );

  const syncTags       = buildSyncTags(d, scores);
  const placementNotes = generatePlacementNotes(d, topCategories, overallSyncScore);

  return {
    scores,
    topCategories,
    syncTags,
    placementNotes,
    overallSyncScore,
    processingTimeMs: Date.now() - startMs,
  };
}

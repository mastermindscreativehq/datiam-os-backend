export const DNA_ANALYZER_VERSION = '1.0.0';

// ── Genre Taxonomy ────────────────────────────────────────────────────────────

export const GENRES = [
  'Hip-Hop', 'Trap', 'R&B', 'Soul', 'Pop', 'Dance/EDM', 'House', 'Techno',
  'Drum & Bass', 'Dubstep', 'Ambient', 'Classical', 'Jazz', 'Blues', 'Rock',
  'Metal', 'Punk', 'Country', 'Folk', 'Reggae', 'Latin', 'Afrobeats',
  'Gospel', 'Neo-Soul', 'Indie', 'Alternative', 'Cinematic', 'Electronic',
  'World Music', 'Orchestral', 'Lo-Fi', 'Unknown',
] as const;

export type Genre = typeof GENRES[number];

// ── Mood Taxonomy ────────────────────────────────────────────────────────────

export const MOODS = [
  'Euphoric', 'Melancholic', 'Tense', 'Peaceful', 'Triumphant', 'Aggressive',
  'Romantic', 'Spiritual', 'Dark', 'Uplifting', 'Nostalgic', 'Anxious',
  'Confident', 'Mysterious', 'Playful', 'Raw', 'Cinematic', 'Dreamy',
] as const;

export type Mood = typeof MOODS[number];

// ── BPM-to-genre hint ranges ─────────────────────────────────────────────────

export interface BpmGenreHint {
  min: number;
  max: number;
  genres: Genre[];
  weight: number;
}

export const BPM_GENRE_HINTS: BpmGenreHint[] = [
  { min: 60,  max: 75,  genres: ['Ambient', 'Classical', 'Gospel'],                weight: 0.4 },
  { min: 70,  max: 85,  genres: ['Soul', 'Blues', 'Jazz'],                          weight: 0.5 },
  { min: 80,  max: 100, genres: ['R&B', 'Neo-Soul', 'Lo-Fi'],                       weight: 0.6 },
  { min: 90,  max: 110, genres: ['Hip-Hop', 'Pop', 'Reggae'],                       weight: 0.7 },
  { min: 100, max: 125, genres: ['Pop', 'Country', 'Rock', 'Indie'],                weight: 0.65 },
  { min: 120, max: 135, genres: ['Dance/EDM', 'House', 'Pop'],                      weight: 0.75 },
  { min: 128, max: 145, genres: ['Trap', 'Hip-Hop', 'Dance/EDM'],                   weight: 0.7 },
  { min: 140, max: 160, genres: ['Drum & Bass', 'Metal', 'Punk'],                   weight: 0.7 },
  { min: 155, max: 185, genres: ['Drum & Bass', 'Techno', 'Dubstep'],               weight: 0.75 },
  { min: 60,  max: 80,  genres: ['Cinematic', 'Orchestral'],                        weight: 0.45 },
];

// ── Spectral brightness thresholds (Hz) ─────────────────────────────────────

export const SPECTRAL_THRESHOLDS = {
  brightnessMid:  3500,   // above = bright, below = warm/dark
  brightnessHigh: 6000,   // above = very bright
  warmthLow:      1200,   // below = warm
  darknessMid:    800,    // below = dark
};

// ── Loudness dynamics interpretation ─────────────────────────────────────────

export const LOUDNESS_THRESHOLDS = {
  veryLoud:   -6,
  loud:       -10,
  medium:     -16,
  quiet:      -23,
};

// ── Fingerprint types ────────────────────────────────────────────────────────

export interface EmotionalFingerprint {
  valence:   number;  // 0–100 (negative → positive)
  arousal:   number;  // 0–100 (calm → energetic)
  dominance: number;  // 0–100 (weak → strong)
  primary_emotion: string;
  emotion_tags:    string[];
}

export interface SonicFingerprint {
  spectral_character: string;    // 'bright' | 'warm' | 'dark' | 'balanced'
  dynamic_range:      string;    // 'compressed' | 'moderate' | 'dynamic'
  texture:            string;    // 'dense' | 'sparse' | 'layered'
  harmonic_richness:  number;    // 0–100
  rhythmic_density:   number;    // 0–100
  spatial_depth:      number;    // 0–100 (mono → wide stereo)
}

export interface EnergyFingerprint {
  arc_type:    string;  // from energy analysis
  peak_type:   string;
  volatility:  number;  // 0–100
  drop_impact: number;  // 0–100
  tension_arc: string;
  retention:   number;  // 0–100
}

export interface MoodProfile {
  primary:   string;
  secondary: string;
  intensity: number;  // 0–100
  valence:   number;  // 0–100
  weights:   Record<string, number>;
}

export interface DnaResult {
  primaryGenre:   string;
  secondaryGenre: string | null;
  genreConfidence: number;
  genreTags:       string[];

  moodPrimary:   string;
  moodSecondary: string | null;
  moodProfile:   MoodProfile;

  emotionalFingerprint: EmotionalFingerprint;
  sonicFingerprint:     SonicFingerprint;
  energyFingerprint:    EnergyFingerprint;

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

  processingTimeMs: number;
}

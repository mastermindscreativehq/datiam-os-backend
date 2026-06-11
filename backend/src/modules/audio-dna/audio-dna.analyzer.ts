import type { AudioAnalysis } from '../../db/schema';
import {
  BPM_GENRE_HINTS,
  SPECTRAL_THRESHOLDS,
  LOUDNESS_THRESHOLDS,
  type DnaResult,
  type EmotionalFingerprint,
  type SonicFingerprint,
  type EnergyFingerprint,
  type MoodProfile,
} from './audio-dna.schema';

// ── Utilities ─────────────────────────────────────────────────────────────────

function clamp(v: number, lo = 0, hi = 100): number {
  return Math.max(lo, Math.min(hi, v));
}

function lerp(v: number, inLo: number, inHi: number, outLo: number, outHi: number): number {
  const t = (v - inLo) / (inHi - inLo || 1);
  return clamp(outLo + t * (outHi - outLo));
}

// ── Genre Classification ──────────────────────────────────────────────────────

interface GenreScore { genre: string; score: number }

function classifyGenre(
  bpm: number | null,
  spectralCentroid: number | null,
  loudnessLufs: number | null,
  existingGenreConfidence: Record<string, number> | null,
): { primary: string; secondary: string | null; confidence: number; tags: string[] } {
  const votes: Record<string, number> = {};

  // 1. Carry forward any existing confidence map
  if (existingGenreConfidence && typeof existingGenreConfidence === 'object') {
    for (const [genre, conf] of Object.entries(existingGenreConfidence)) {
      if (typeof conf === 'number') votes[genre] = (votes[genre] ?? 0) + conf * 0.5;
    }
  }

  // 2. BPM hints
  if (bpm !== null && bpm > 0) {
    for (const hint of BPM_GENRE_HINTS) {
      if (bpm >= hint.min && bpm <= hint.max) {
        for (const genre of hint.genres) {
          votes[genre] = (votes[genre] ?? 0) + hint.weight * 20;
        }
      }
    }
  }

  // 3. Spectral centroid hints
  if (spectralCentroid !== null && spectralCentroid > 0) {
    if (spectralCentroid > SPECTRAL_THRESHOLDS.brightnessHigh) {
      ['Dance/EDM', 'Electronic', 'Pop'].forEach(g => { votes[g] = (votes[g] ?? 0) + 15; });
    } else if (spectralCentroid > SPECTRAL_THRESHOLDS.brightnessMid) {
      ['Rock', 'Pop', 'Indie', 'Metal'].forEach(g => { votes[g] = (votes[g] ?? 0) + 10; });
    } else if (spectralCentroid < SPECTRAL_THRESHOLDS.darknessMid) {
      ['Ambient', 'Cinematic', 'Classical', 'Orchestral'].forEach(g => { votes[g] = (votes[g] ?? 0) + 12; });
    } else {
      ['R&B', 'Hip-Hop', 'Soul', 'Lo-Fi'].forEach(g => { votes[g] = (votes[g] ?? 0) + 8; });
    }
  }

  // 4. Loudness hints
  if (loudnessLufs !== null) {
    if (loudnessLufs > LOUDNESS_THRESHOLDS.veryLoud) {
      ['Metal', 'Punk', 'Dance/EDM', 'Trap'].forEach(g => { votes[g] = (votes[g] ?? 0) + 10; });
    } else if (loudnessLufs < LOUDNESS_THRESHOLDS.quiet) {
      ['Ambient', 'Classical', 'Folk', 'Gospel'].forEach(g => { votes[g] = (votes[g] ?? 0) + 10; });
    }
  }

  // 5. Sort and return top results
  const sorted: GenreScore[] = Object.entries(votes)
    .map(([genre, score]) => ({ genre, score }))
    .sort((a, b) => b.score - a.score);

  if (sorted.length === 0) {
    return { primary: 'Unknown', secondary: null, confidence: 0, tags: [] };
  }

  const topScore = sorted[0].score;
  const confidence = clamp(Math.round((topScore / (topScore + 30)) * 100));
  const tags = sorted.slice(0, 5).map(s => s.genre);

  return {
    primary:    sorted[0].genre,
    secondary:  sorted[1]?.genre ?? null,
    confidence,
    tags,
  };
}

// ── Mood Classification ───────────────────────────────────────────────────────

function classifyMood(
  bpm: number | null,
  loudness: number | null,
  spectralCentroid: number | null,
  existingEmotionalProfile: Record<string, unknown> | null,
  brightness: number,
  darkness: number,
  aggression: number,
): { primary: string; secondary: string | null; profile: MoodProfile } {
  const weights: Record<string, number> = {};

  // Carry forward existing emotional profile
  if (existingEmotionalProfile) {
    const primary = existingEmotionalProfile['primary_emotion'];
    if (typeof primary === 'string') {
      weights[primary] = (weights[primary] ?? 0) + 40;
    }
  }

  // BPM-based mood hints
  if (bpm !== null) {
    if (bpm < 75) {
      ['Peaceful', 'Melancholic', 'Dreamy', 'Spiritual'].forEach(m => { weights[m] = (weights[m] ?? 0) + 20; });
    } else if (bpm < 100) {
      ['Romantic', 'Nostalgic', 'Mysterious', 'Spiritual'].forEach(m => { weights[m] = (weights[m] ?? 0) + 15; });
    } else if (bpm < 125) {
      ['Confident', 'Uplifting', 'Playful', 'Triumphant'].forEach(m => { weights[m] = (weights[m] ?? 0) + 18; });
    } else if (bpm < 145) {
      ['Euphoric', 'Triumphant', 'Confident', 'Uplifting'].forEach(m => { weights[m] = (weights[m] ?? 0) + 20; });
    } else {
      ['Aggressive', 'Tense', 'Raw', 'Euphoric'].forEach(m => { weights[m] = (weights[m] ?? 0) + 18; });
    }
  }

  // Brightness/darkness dimensional hints
  if (brightness > 70) {
    ['Euphoric', 'Uplifting', 'Triumphant', 'Playful'].forEach(m => { weights[m] = (weights[m] ?? 0) + 12; });
  } else if (darkness > 65) {
    ['Dark', 'Mysterious', 'Tense', 'Melancholic'].forEach(m => { weights[m] = (weights[m] ?? 0) + 15; });
  }

  if (aggression > 70) {
    ['Aggressive', 'Raw', 'Tense'].forEach(m => { weights[m] = (weights[m] ?? 0) + 15; });
  }

  const sorted = Object.entries(weights)
    .sort((a, b) => b[1] - a[1]);

  const totalWeight = sorted.reduce((s, [, w]) => s + w, 0);

  const primary = sorted[0]?.[0] ?? 'Neutral';
  const secondary = sorted[1]?.[0] ?? null;

  const normalised: Record<string, number> = {};
  for (const [mood, w] of sorted) {
    normalised[mood] = Math.round((w / (totalWeight || 1)) * 100);
  }

  const valence = computeValence(primary, secondary);
  const intensity = clamp(Math.round((loudness ? lerp(loudness, -30, -6, 20, 90) : 50)));

  return {
    primary,
    secondary,
    profile: { primary, secondary: secondary ?? '', intensity, valence, weights: normalised },
  };
}

function computeValence(primary: string, secondary: string | null): number {
  const positiveMap: Record<string, number> = {
    Euphoric: 90, Triumphant: 85, Uplifting: 80, Romantic: 75, Playful: 70,
    Confident: 65, Spiritual: 60, Peaceful: 55, Dreamy: 50,
  };
  const negativeMap: Record<string, number> = {
    Melancholic: 25, Dark: 20, Tense: 30, Aggressive: 25, Anxious: 30, Raw: 35,
  };
  const v1 = positiveMap[primary] ?? negativeMap[primary] ?? 50;
  const v2 = secondary ? (positiveMap[secondary] ?? negativeMap[secondary] ?? 50) : v1;
  return clamp(Math.round((v1 * 0.7 + v2 * 0.3)));
}

// ── Sonic Dimensions ──────────────────────────────────────────────────────────

function computeSonicDimensions(
  bpm: number | null,
  loudnessLufs: number | null,
  spectralCentroid: number | null,
  energyVolatility: number | null,
  dropStrength: number | null,
  replayRetention: number | null,
  energyArc: string | null,
): {
  danceability: number; brightness: number; warmth: number; darkness: number;
  aggression: number; spirituality: number; romance: number; triumph: number;
  melancholy: number; tension: number;
} {
  const centroid = spectralCentroid ?? 2000;
  const lufs     = loudnessLufs ?? -16;
  const bpmVal   = bpm ?? 100;
  const vol      = energyVolatility ?? 50;
  const drop     = dropStrength ?? 50;
  const retain   = replayRetention ?? 50;

  // Danceability: BPM in dance range + loudness + low volatility
  const danceableBpm = bpmVal >= 118 && bpmVal <= 135 ? 80 : lerp(bpmVal, 80, 160, 20, 70);
  const danceability = clamp(Math.round(danceableBpm * 0.5 + lerp(lufs, -24, -6, 30, 70) * 0.3 + (100 - vol) * 0.2));

  // Brightness: spectral centroid dominant
  const brightness = clamp(Math.round(lerp(centroid, 500, 8000, 5, 95)));

  // Warmth: inverse brightness, boosted by low BPM
  const warmth = clamp(Math.round((100 - brightness) * 0.6 + lerp(bpmVal, 60, 140, 60, 10) * 0.4));

  // Darkness: low spectral centroid + high tension
  const tension_raw = clamp(Math.round(lerp(vol, 20, 80, 20, 85)));
  const darkness = clamp(Math.round(lerp(centroid, 300, 4000, 80, 10) * 0.6 + tension_raw * 0.4));

  // Aggression: high loudness + high BPM + high drop
  const aggression = clamp(Math.round(
    lerp(lufs, -24, -4, 10, 80) * 0.35 +
    lerp(bpmVal, 80, 180, 10, 85) * 0.35 +
    drop * 0.3,
  ));

  // Spirituality: slow BPM + dark/warm + low aggression
  const spirituality = clamp(Math.round(
    lerp(bpmVal, 60, 140, 70, 10) * 0.4 +
    warmth * 0.3 +
    darkness * 0.3,
  ));

  // Romance: warm + slow + low aggression + high retention
  const romance = clamp(Math.round(
    warmth * 0.3 +
    lerp(bpmVal, 60, 140, 70, 20) * 0.25 +
    (100 - aggression) * 0.25 +
    retain * 0.2,
  ));

  // Triumph: high BPM + high loudness + rising arc
  const arcBonus = energyArc === 'rising' ? 20 : energyArc === 'peak' ? 10 : 0;
  const triumph = clamp(Math.round(
    lerp(bpmVal, 90, 160, 20, 80) * 0.35 +
    lerp(lufs, -24, -6, 10, 70) * 0.35 +
    (100 - darkness) * 0.2 +
    arcBonus * 0.1,
  ));

  // Melancholy: darkness + low BPM + low brightness
  const melancholy = clamp(Math.round(
    darkness * 0.4 +
    lerp(bpmVal, 60, 140, 70, 15) * 0.35 +
    (100 - brightness) * 0.25,
  ));

  // Tension: volatility + drop + high spectral centroid
  const tension = clamp(Math.round(
    vol * 0.4 +
    drop * 0.35 +
    lerp(centroid, 500, 8000, 10, 65) * 0.25,
  ));

  return { danceability, brightness, warmth, darkness, aggression, spirituality, romance, triumph, melancholy, tension };
}

// ── Fingerprint Builders ──────────────────────────────────────────────────────

function buildEmotionalFingerprint(
  existingProfile: Record<string, unknown> | null,
  mood: { primary: string; profile: MoodProfile },
  aggression: number,
  triumph: number,
): EmotionalFingerprint {
  const valence   = mood.profile.valence;
  const arousal   = clamp(Math.round(aggression * 0.5 + triumph * 0.3 + mood.profile.intensity * 0.2));
  const dominance = clamp(Math.round(triumph * 0.5 + aggression * 0.3 + (100 - mood.profile.valence < 50 ? 20 : 0)));

  return {
    valence,
    arousal,
    dominance,
    primary_emotion: mood.primary,
    emotion_tags:    Object.keys(mood.profile.weights).slice(0, 5),
  };
}

function buildSonicFingerprint(
  spectralCentroid: number | null,
  loudnessLufs: number | null,
  channels: number | null,
  brightness: number,
  danceability: number,
): SonicFingerprint {
  const centroid = spectralCentroid ?? 2000;
  const lufs     = loudnessLufs ?? -16;

  let spectral_character: string;
  if (brightness > 70)       spectral_character = 'bright';
  else if (brightness < 35)  spectral_character = 'dark';
  else if (centroid < 1500)  spectral_character = 'warm';
  else                       spectral_character = 'balanced';

  let dynamic_range: string;
  if (lufs > -8)        dynamic_range = 'compressed';
  else if (lufs < -20)  dynamic_range = 'dynamic';
  else                  dynamic_range = 'moderate';

  const harmonic_richness = clamp(Math.round(lerp(centroid, 500, 6000, 20, 85)));
  const rhythmic_density  = clamp(Math.round(danceability * 0.7 + 15));
  const spatial_depth     = clamp(channels === 2 ? 65 : channels === 1 ? 30 : 50);

  return {
    spectral_character,
    dynamic_range,
    texture: danceability > 65 ? 'dense' : danceability < 35 ? 'sparse' : 'layered',
    harmonic_richness,
    rhythmic_density,
    spatial_depth,
  };
}

function buildEnergyFingerprint(
  energyArc: string | null,
  peakMoment: string | null,
  volatility: number,
  dropStrength: number,
  tensionCurve: string | null,
  replayRetention: number,
): EnergyFingerprint {
  return {
    arc_type:    energyArc ?? 'unknown',
    peak_type:   peakMoment ?? 'unknown',
    volatility:  clamp(volatility),
    drop_impact: clamp(dropStrength),
    tension_arc: tensionCurve ?? 'steady',
    retention:   clamp(replayRetention),
  };
}

// ── Main Entrypoint ──────────────────────────────────────────────────────────

export interface EnergyContext {
  energyArc:        string | null;
  peakMoment:       string | null;
  dropStrength:     number;
  energyVolatility: number;
  tensionCurve:     string | null;
  replayRetention:  number;
}

export function computeAudioDna(
  analysis: AudioAnalysis,
  energy: EnergyContext | null,
): DnaResult {
  const startMs = Date.now();

  const bpm              = analysis.bpm              ? parseFloat(String(analysis.bpm))              : null;
  const loudnessLufs     = analysis.loudness_lufs    ? parseFloat(String(analysis.loudness_lufs))    : null;
  const spectralCentroid = analysis.spectral_centroid ? parseFloat(String(analysis.spectral_centroid)) : null;

  const existingGenreConf = analysis.genre_confidence as Record<string, number> | null;
  const existingEmotion   = analysis.emotional_profile as Record<string, unknown> | null;

  const energyArc        = energy?.energyArc        ?? null;
  const peakMoment       = energy?.peakMoment       ?? null;
  const dropStrength     = energy?.dropStrength      ?? 50;
  const energyVolatility = energy?.energyVolatility  ?? 50;
  const tensionCurve     = energy?.tensionCurve      ?? null;
  const replayRetention  = energy?.replayRetention   ?? 50;

  // Compute sonic dimensions first (needed for mood + fingerprints)
  const dims = computeSonicDimensions(
    bpm, loudnessLufs, spectralCentroid,
    energyVolatility, dropStrength, replayRetention, energyArc,
  );

  const genre = classifyGenre(bpm, spectralCentroid, loudnessLufs, existingGenreConf);
  const mood  = classifyMood(bpm, loudnessLufs, spectralCentroid, existingEmotion, dims.brightness, dims.darkness, dims.aggression);

  const emotionalFingerprint = buildEmotionalFingerprint(existingEmotion, mood, dims.aggression, dims.triumph);
  const sonicFingerprint     = buildSonicFingerprint(spectralCentroid, loudnessLufs, analysis.channels, dims.brightness, dims.danceability);
  const energyFingerprint    = buildEnergyFingerprint(energyArc, peakMoment, energyVolatility, dropStrength, tensionCurve, replayRetention);

  return {
    primaryGenre:    genre.primary,
    secondaryGenre:  genre.secondary,
    genreConfidence: genre.confidence,
    genreTags:       genre.tags,

    moodPrimary:   mood.primary,
    moodSecondary: mood.secondary,
    moodProfile:   mood.profile,

    emotionalFingerprint,
    sonicFingerprint,
    energyFingerprint,

    ...dims,

    processingTimeMs: Date.now() - startMs,
  };
}

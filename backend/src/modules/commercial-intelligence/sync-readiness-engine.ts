import type { DnaInputForSync } from '../sync-intelligence/sync-intelligence.types';
import type { SyncReadinessScore, SyncReadinessScores, ReadinessFactor } from './commercial-intelligence.types';

function clamp(v: number): number {
  return Math.max(0, Math.min(100, Math.round(v)));
}

function buildHookStrength(d: DnaInputForSync): SyncReadinessScore {
  const factors: ReadinessFactor[] = [];
  let score = 45;

  if (d.triumph > 65) { factors.push({ factor: 'Strong Triumph Signal', points: 15, direction: 'positive' }); score += 15; }
  if (d.brightness > 65) { factors.push({ factor: 'High Brightness = Immediate Appeal', points: 12, direction: 'positive' }); score += 12; }
  if (d.danceability > 65) { factors.push({ factor: 'High Danceability = Commercial Hook', points: 10, direction: 'positive' }); score += 10; }
  if (d.dropStrength > 65) { factors.push({ factor: 'Strong Drop Increases Hook Impact', points: 8, direction: 'positive' }); score += 8; }
  if (d.triumph > 45 && d.triumph <= 65) { factors.push({ factor: 'Moderate Triumph Energy', points: 5, direction: 'positive' }); score += 5; }
  if (d.melancholy > 65) { factors.push({ factor: 'Dominant Melancholy Weakens Hook', points: -8, direction: 'negative' }); score -= 8; }
  if (d.darkness > 65) { factors.push({ factor: 'Dark Atmosphere Reduces Hook Clarity', points: -8, direction: 'negative' }); score -= 8; }
  if (d.tension > 70) { factors.push({ factor: 'High Tension Limits Immediate Hook', points: -5, direction: 'negative' }); score -= 5; }

  return {
    key: 'hookStrength',
    label: 'Hook Strength',
    score: clamp(score),
    description: "Measures the immediate commercial appeal and memorability of the track's opening and chorus structure.",
    factors,
  };
}

function buildEnergyCurve(d: DnaInputForSync): SyncReadinessScore {
  const factors: ReadinessFactor[] = [];
  let score = 45;

  const arc = (d.energyArc ?? '').toLowerCase();
  if (arc.includes('build') || arc.includes('peak')) {
    factors.push({ factor: 'Strong Ascending Energy Arc', points: 15, direction: 'positive' }); score += 15;
  } else if (arc.includes('drop')) {
    factors.push({ factor: 'Drop-Focused Energy Structure', points: 12, direction: 'positive' }); score += 12;
  } else if (arc.includes('steady') || arc.includes('flat')) {
    factors.push({ factor: 'Consistent Energy Level', points: 5, direction: 'positive' }); score += 5;
  } else if (arc.includes('declin')) {
    factors.push({ factor: 'Declining Energy Curve', points: -10, direction: 'negative' }); score -= 10;
  } else if (arc.includes('complex') || arc.includes('varied')) {
    factors.push({ factor: 'Complex Energy Variation', points: 8, direction: 'positive' }); score += 8;
  }

  if (d.dropStrength > 60) { factors.push({ factor: 'Strong Drops Create Energy Peaks', points: 12, direction: 'positive' }); score += 12; }
  if (d.volatility >= 30 && d.volatility <= 70) { factors.push({ factor: 'Balanced Energy Volatility', points: 10, direction: 'positive' }); score += 10; }
  if (d.volatility > 80) { factors.push({ factor: 'Excessive Volatility (Chaotic Arc)', points: -8, direction: 'negative' }); score -= 8; }
  if (d.volatility < 20) { factors.push({ factor: 'Low Volatility (Flat Energy)', points: -5, direction: 'negative' }); score -= 5; }

  return {
    key: 'energyCurve',
    label: 'Energy Curve',
    score: clamp(score),
    description: 'Evaluates the dynamic energy arc — how well the track builds, drops, and sustains commercial momentum.',
    factors,
  };
}

function buildVocalClarity(d: DnaInputForSync): SyncReadinessScore {
  const factors: ReadinessFactor[] = [];
  let score = 45;

  if (d.romance > 60) { factors.push({ factor: 'Strong Emotional Vocal Delivery', points: 12, direction: 'positive' }); score += 12; }
  if (d.warmth > 60) { factors.push({ factor: 'Warm Tonal Profile = Vocal Presence', points: 10, direction: 'positive' }); score += 10; }
  if (d.brightness > 60) { factors.push({ factor: 'Bright Mix = Vocal Forward Profile', points: 8, direction: 'positive' }); score += 8; }
  if (d.darkness > 65) { factors.push({ factor: 'Dark Production Masks Vocal Clarity', points: -8, direction: 'negative' }); score -= 8; }
  if (d.aggression > 70) { factors.push({ factor: 'High Aggression Reduces Vocal Clarity', points: -8, direction: 'negative' }); score -= 8; }

  const genre = (d.primaryGenre ?? '').toLowerCase();
  if (genre.includes('soul') || genre.includes('r&b') || genre.includes('rnb')) {
    factors.push({ factor: 'Vocal-Forward Genre (Soul/R&B)', points: 15, direction: 'positive' }); score += 15;
  } else if (genre.includes('pop')) {
    factors.push({ factor: 'Pop Genre = Commercial Vocal Profile', points: 12, direction: 'positive' }); score += 12;
  } else if (genre.includes('hip-hop') || genre.includes('hip hop') || genre.includes('rap')) {
    factors.push({ factor: 'Hip-Hop Vocal Delivery Style', points: 8, direction: 'positive' }); score += 8;
  } else if (genre.includes('electronic') || genre.includes('edm')) {
    factors.push({ factor: 'Electronic Genre (Reduced Vocal Focus)', points: -5, direction: 'negative' }); score -= 5;
  } else if (genre.includes('ambient') || genre.includes('instrumental')) {
    factors.push({ factor: 'Ambient/Instrumental (Minimal Vocals)', points: -8, direction: 'negative' }); score -= 8;
  }

  return {
    key: 'vocalClarity',
    label: 'Vocal Clarity',
    score: clamp(score),
    description: 'Assesses the clarity, presence, and commercial strength of vocal delivery for sync placements.',
    factors,
  };
}

function buildInstrumentalValue(d: DnaInputForSync): SyncReadinessScore {
  const factors: ReadinessFactor[] = [];
  let score = 40;

  if (d.tension > 60) { factors.push({ factor: 'High Tension = Cinematic Underscore Value', points: 15, direction: 'positive' }); score += 15; }
  if (d.darkness > 55) { factors.push({ factor: 'Dark Atmosphere = Dramatic Scoring Potential', points: 12, direction: 'positive' }); score += 12; }
  if (d.spirituality > 60) { factors.push({ factor: 'Spiritual Depth = Meditative Placement Value', points: 10, direction: 'positive' }); score += 10; }
  if (d.triumph > 60) { factors.push({ factor: 'Triumph Energy = Motivational Instrumental', points: 8, direction: 'positive' }); score += 8; }
  if (d.melancholy > 60) { factors.push({ factor: 'Melancholic Depth = Drama / Underscore Value', points: 8, direction: 'positive' }); score += 8; }
  if (d.danceability > 75) { factors.push({ factor: 'High Dance Focus Reduces Underscore Utility', points: -5, direction: 'negative' }); score -= 5; }

  const genre = (d.primaryGenre ?? '').toLowerCase();
  if (genre.includes('ambient') || genre.includes('orchestral') || genre.includes('cinematic') || genre.includes('instrumental')) {
    factors.push({ factor: 'Instrumental Genre Profile', points: 20, direction: 'positive' }); score += 20;
  } else if (genre.includes('electronic') || genre.includes('edm')) {
    factors.push({ factor: 'Electronic = Strong Instrumental Potential', points: 10, direction: 'positive' }); score += 10;
  } else if (genre.includes('hip-hop') || genre.includes('hip hop') || genre.includes('trap')) {
    factors.push({ factor: 'Hip-Hop / Trap (Vocal-Dominant Genre)', points: -5, direction: 'negative' }); score -= 5;
  }

  return {
    key: 'instrumentalValue',
    label: 'Instrumental Value',
    score: clamp(score),
    description: 'Measures the value of this track as an instrumental — for scoring, underscore, or non-vocal sync placements.',
    factors,
  };
}

function buildReplayValue(d: DnaInputForSync): SyncReadinessScore {
  const factors: ReadinessFactor[] = [];
  let score = 45;

  if (d.retention > 70) { factors.push({ factor: 'High Replay Retention Score', points: 15, direction: 'positive' }); score += 15; }
  if (d.danceability > 60) { factors.push({ factor: 'Danceable = Drives Repeat Plays', points: 8, direction: 'positive' }); score += 8; }
  if (d.brightness > 60) { factors.push({ factor: 'Bright Energy = Positive Association Loop', points: 8, direction: 'positive' }); score += 8; }
  if (d.volatility >= 25 && d.volatility <= 60) { factors.push({ factor: 'Engaging Dynamic Variation', points: 10, direction: 'positive' }); score += 10; }
  if (d.volatility > 75) { factors.push({ factor: 'Too Chaotic for Consistent Repeat Listening', points: -8, direction: 'negative' }); score -= 8; }
  if (d.melancholy > 70) { factors.push({ factor: 'Deep Melancholy Reduces Casual Replay', points: -5, direction: 'negative' }); score -= 5; }
  if (d.darkness > 70) { factors.push({ factor: 'Intense Darkness Limits Casual Playback', points: -6, direction: 'negative' }); score -= 6; }
  if (d.retention < 35) { factors.push({ factor: 'Low Retention = Weak Replay Loop', points: -10, direction: 'negative' }); score -= 10; }

  return {
    key: 'replayValue',
    label: 'Replay Value',
    score: clamp(score),
    description: 'Evaluates how likely a sync placement will generate repeated use — critical for campaign durability.',
    factors,
  };
}

function buildBrandSuitability(d: DnaInputForSync): SyncReadinessScore {
  const factors: ReadinessFactor[] = [];
  let score = 45;

  if (d.brightness > 65) { factors.push({ factor: 'High Brightness = Brand-Safe Profile', points: 15, direction: 'positive' }); score += 15; }
  if (d.warmth > 65) { factors.push({ factor: 'Warm Profile = Brand-Friendly Tone', points: 12, direction: 'positive' }); score += 12; }
  if (d.triumph > 60) { factors.push({ factor: 'Achievement Narrative = Brand Alignment', points: 10, direction: 'positive' }); score += 10; }
  if (d.romance > 60) { factors.push({ factor: 'Romantic Quality = Lifestyle Brand Value', points: 6, direction: 'positive' }); score += 6; }
  if (d.spirituality > 60) { factors.push({ factor: 'Spiritual Depth = Premium Brand Resonance', points: 5, direction: 'positive' }); score += 5; }
  if (d.darkness > 65) { factors.push({ factor: 'Dark Atmosphere = Brand Safety Risk', points: -15, direction: 'negative' }); score -= 15; }
  if (d.aggression > 70) { factors.push({ factor: 'High Aggression = Brand Safety Risk', points: -12, direction: 'negative' }); score -= 12; }
  if (d.tension > 75) { factors.push({ factor: 'Extreme Tension Limits Brand Use Cases', points: -8, direction: 'negative' }); score -= 8; }
  if (d.melancholy > 70) { factors.push({ factor: 'Heavy Melancholy = Brand Misalignment', points: -8, direction: 'negative' }); score -= 8; }

  return {
    key: 'brandSuitability',
    label: 'Brand Suitability',
    score: clamp(score),
    description: 'Rates how well this track aligns with brand campaigns — considers tone, safety, and emotional match.',
    factors,
  };
}

export function buildSyncReadinessScores(d: DnaInputForSync): SyncReadinessScores {
  const hookStrength      = buildHookStrength(d);
  const energyCurve       = buildEnergyCurve(d);
  const vocalClarity      = buildVocalClarity(d);
  const instrumentalValue = buildInstrumentalValue(d);
  const replayValue       = buildReplayValue(d);
  const brandSuitability  = buildBrandSuitability(d);

  const overallReadiness = Math.round(
    hookStrength.score      * 0.20 +
    energyCurve.score       * 0.20 +
    vocalClarity.score      * 0.15 +
    instrumentalValue.score * 0.15 +
    replayValue.score       * 0.15 +
    brandSuitability.score  * 0.15,
  );

  return { hookStrength, energyCurve, vocalClarity, instrumentalValue, replayValue, brandSuitability, overallReadiness };
}

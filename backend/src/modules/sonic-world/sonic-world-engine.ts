import type { SonicWorldInput } from './sonic-world.types';
import { computeGenreDNA }            from './engines/genre-dna-engine';
import { computeInstrumentation }     from './engines/instrumentation-engine';
import { computeVocalArchitecture }   from './engines/vocal-engine';
import { computeCinematicEnvironment } from './engines/cinematic-engine';
import { computeRhythmIntelligence }  from './engines/rhythm-engine';
import { computeHarmonicEmotion }     from './engines/harmonic-engine';
import { computeHookStrategy }        from './engines/hook-engine';
import { computeProductionDensity }   from './engines/density-engine';

export interface SonicWorldOutput {
  // Genre DNA
  primary_genre: string;
  secondary_genre: string;
  rhythm_influence: string;
  sonic_fusion_identity: string;
  // Instrumentation
  drum_style: string;
  percussion_textures: string;
  bass_character: string;
  melodic_instruments: string;
  ambient_layers: string;
  organic_synthetic_ratio: string;
  // Vocal Architecture
  vocal_texture: string;
  cadence_energy: string;
  harmony_behavior: string;
  emotional_intensity: string;
  vocal_atmosphere: string;
  // Cinematic Environment
  visual_sonic_atmosphere: string;
  emotional_weather: string;
  scene_energy: string;
  cinematic_references: string;
  // Rhythm Intelligence
  bpm: number;
  groove_behavior: string;
  movement_energy: string;
  percussion_complexity: string;
  swing_characteristics: string;
  // Harmonic Emotion System
  musical_key: string;
  scale: string;
  chord_behavior: string;
  emotional_progression: string;
  tension_release_behavior: string;
  // Hook Strategy
  hook_intensity: string;
  chant_potential: string;
  replayability: string;
  anthem_potential: string;
  crowd_engagement_energy: string;
  // Production Density (0–100)
  cinematic_density: number;
  spiritual_intensity: number;
  emotional_rawness: number;
  commercial_accessibility: number;
  darkness_vs_hope: number;
  underground_vs_mainstream: number;
  organic_vs_synthetic: number;
  // Assembly
  producer_brief: string;
  coherence_score: number;
}

function storyHash(s: string): number {
  if (s.length === 0) return 0;
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = ((h * 31) + s.charCodeAt(i)) >>> 0;
  }
  return h;
}

function buildHash(input: SonicWorldInput): number {
  const seed = `${input.emotion}:${input.intention}:${input.listener_transformation}:${input.story ?? ''}`;
  return storyHash(seed);
}

type PartialOutput = Omit<SonicWorldOutput, 'producer_brief' | 'coherence_score'>;

function buildProducerBrief(o: PartialOutput): string {
  return [
    `This track inhabits the world of ${o.primary_genre} — ${o.sonic_fusion_identity}.`,
    `The sonic environment is ${o.visual_sonic_atmosphere}: ${o.emotional_weather}.`,
    `Rhythm settles at ${o.bpm}bpm with ${o.groove_behavior}, while ${o.drum_style} carries the pulse.`,
    `The vocalist brings ${o.vocal_texture} — ${o.vocal_atmosphere} — over ${o.melodic_instruments} and ${o.ambient_layers}.`,
    `Build toward ${o.hook_intensity}, anchored in ${o.musical_key} ${o.scale} with ${o.chord_behavior}.`,
  ].join(' ');
}

function computeCoherence(o: PartialOutput, input: SonicWorldInput): number {
  let score = 0.75;

  const slowEmotions = ['grief', 'trauma', 'peace', 'melancholy', 'longing'];
  const fastEmotions = ['rage', 'euphoria', 'joy', 'triumph', 'defiance'];
  if ((slowEmotions.includes(input.emotion) && o.bpm < 100) ||
      (fastEmotions.includes(input.emotion) && o.bpm > 90)) {
    score += 0.05;
  }

  if (o.organic_vs_synthetic < 50 && o.organic_synthetic_ratio.includes('organic')) {
    score += 0.04;
  }

  if (o.spiritual_intensity > 60 &&
      ['gospel', 'uplift', 'peace', 'ambient'].some(k =>
        o.secondary_genre.toLowerCase().includes(k) ||
        o.primary_genre.toLowerCase().includes(k))) {
    score += 0.05;
  }

  if (o.commercial_accessibility > 70 && o.emotional_rawness > 80) score -= 0.04;

  if (o.cinematic_density > 70 && o.scene_energy.length > 50) score += 0.03;

  return parseFloat(Math.max(0, Math.min(1, score)).toFixed(2));
}

export function computeSonicWorld(input: SonicWorldInput): SonicWorldOutput {
  const hash = buildHash(input);

  const genre     = computeGenreDNA(input, hash);
  const instru    = computeInstrumentation(input, hash);
  const vocal     = computeVocalArchitecture(input, hash);
  const cinematic = computeCinematicEnvironment(input, hash);
  const rhythm    = computeRhythmIntelligence(input, hash);
  const harmonic  = computeHarmonicEmotion(input, hash);
  const hook      = computeHookStrategy(input, hash);
  const density   = computeProductionDensity(input);

  const partial: PartialOutput = {
    ...genre, ...instru, ...vocal, ...cinematic,
    ...rhythm, ...harmonic, ...hook, ...density,
  };

  return {
    ...partial,
    producer_brief:  buildProducerBrief(partial),
    coherence_score: computeCoherence(partial, input),
  };
}

import type { EmotionType, IntentionType, SonicWorldInput } from '../sonic-world.types';

export interface ProductionDensityOutput {
  cinematic_density: number;
  spiritual_intensity: number;
  emotional_rawness: number;
  commercial_accessibility: number;
  darkness_vs_hope: number;
  underground_vs_mainstream: number;
  organic_vs_synthetic: number;
}

interface DensityBase {
  cinematic:            number;
  spiritual:            number;
  rawness:              number;
  commercial:           number;
  darknessHope:         number;
  undergroundMainstream: number;
  organicSynthetic:     number;
}

const EMOTION_DENSITY_BASE: Record<EmotionType, DensityBase> = {
  grief:      { cinematic: 55, spiritual: 70, rawness: 75, commercial: 35, darknessHope: 20, undergroundMainstream: 25, organicSynthetic: 35 },
  trauma:     { cinematic: 45, spiritual: 50, rawness: 90, commercial: 20, darknessHope: 10, undergroundMainstream: 15, organicSynthetic: 25 },
  rage:       { cinematic: 65, spiritual: 45, rawness: 85, commercial: 50, darknessHope: 15, undergroundMainstream: 55, organicSynthetic: 20 },
  joy:        { cinematic: 70, spiritual: 65, rawness: 40, commercial: 75, darknessHope: 85, undergroundMainstream: 70, organicSynthetic: 60 },
  melancholy: { cinematic: 50, spiritual: 55, rawness: 65, commercial: 45, darknessHope: 35, undergroundMainstream: 35, organicSynthetic: 50 },
  euphoria:   { cinematic: 80, spiritual: 60, rawness: 35, commercial: 85, darknessHope: 80, undergroundMainstream: 80, organicSynthetic: 25 },
  anxiety:    { cinematic: 55, spiritual: 40, rawness: 80, commercial: 40, darknessHope: 30, undergroundMainstream: 40, organicSynthetic: 30 },
  longing:    { cinematic: 60, spiritual: 55, rawness: 70, commercial: 40, darknessHope: 45, undergroundMainstream: 30, organicSynthetic: 55 },
  triumph:    { cinematic: 85, spiritual: 75, rawness: 50, commercial: 70, darknessHope: 75, undergroundMainstream: 65, organicSynthetic: 45 },
  nostalgia:  { cinematic: 65, spiritual: 65, rawness: 60, commercial: 60, darknessHope: 65, undergroundMainstream: 50, organicSynthetic: 70 },
  peace:      { cinematic: 55, spiritual: 85, rawness: 45, commercial: 45, darknessHope: 80, undergroundMainstream: 20, organicSynthetic: 70 },
  defiance:   { cinematic: 70, spiritual: 60, rawness: 80, commercial: 55, darknessHope: 40, undergroundMainstream: 45, organicSynthetic: 40 },
};

interface IntentionDensityMod {
  cinematic?:            number;
  spiritual?:            number;
  rawness?:              number;
  commercial?:           number;
  darknessHope?:         number;
  undergroundMainstream?: number;
  organicSynthetic?:     number;
}

const INTENTION_DENSITY_MOD: Record<IntentionType, IntentionDensityMod> = {
  heal_listener:    { spiritual: +15, commercial: -10, rawness: +10 },
  inspire_action:   { commercial: +15, darknessHope: +15, undergroundMainstream: +10, cinematic: +10 },
  create_nostalgia: { organicSynthetic: +20, commercial: +5 },
  deliver_message:  { rawness: +5, commercial: -5, undergroundMainstream: -5 },
  uplift_spirit:    { spiritual: +20, darknessHope: +15, cinematic: +5 },
  provoke_thought:  { commercial: -15, undergroundMainstream: -15, rawness: +5 },
  celebrate_truth:  { commercial: +10, darknessHope: +10, spiritual: +5 },
  process_pain:     { rawness: +15, commercial: -10, darknessHope: -15 },
};

function clamp(val: number): number {
  return Math.max(0, Math.min(100, Math.round(val)));
}

export function computeProductionDensity(input: SonicWorldInput): ProductionDensityOutput {
  const base = EMOTION_DENSITY_BASE[input.emotion];
  const mod  = INTENTION_DENSITY_MOD[input.intention];

  return {
    cinematic_density:         clamp(base.cinematic             + (mod.cinematic             ?? 0)),
    spiritual_intensity:       clamp(base.spiritual             + (mod.spiritual             ?? 0)),
    emotional_rawness:         clamp(base.rawness               + (mod.rawness               ?? 0)),
    commercial_accessibility:  clamp(base.commercial            + (mod.commercial            ?? 0)),
    darkness_vs_hope:          clamp(base.darknessHope          + (mod.darknessHope          ?? 0)),
    underground_vs_mainstream: clamp(base.undergroundMainstream + (mod.undergroundMainstream ?? 0)),
    organic_vs_synthetic:      clamp(base.organicSynthetic      + (mod.organicSynthetic      ?? 0)),
  };
}

import { z } from 'zod';

export const generateBlueprintSchema = z.object({
  session_id: z.string().uuid(),
  artist_id:  z.string().uuid(),
});

export type GenerateBlueprintInput = z.infer<typeof generateBlueprintSchema>;

// Full output schema — used for Zod validation before DB insert
export const sonicWorldOutputSchema = z.object({
  // Genre DNA
  primary_genre:             z.string().min(1),
  secondary_genre:           z.string().min(1),
  rhythm_influence:          z.string().min(1),
  sonic_fusion_identity:     z.string().min(1),
  // Instrumentation
  drum_style:                z.string().min(1),
  percussion_textures:       z.string().min(1),
  bass_character:            z.string().min(1),
  melodic_instruments:       z.string().min(1),
  ambient_layers:            z.string().min(1),
  organic_synthetic_ratio:   z.string().min(1),
  // Vocal Architecture
  vocal_texture:             z.string().min(1),
  cadence_energy:            z.string().min(1),
  harmony_behavior:          z.string().min(1),
  emotional_intensity:       z.string().min(1),
  vocal_atmosphere:          z.string().min(1),
  // Cinematic Environment
  visual_sonic_atmosphere:   z.string().min(1),
  emotional_weather:         z.string().min(1),
  scene_energy:              z.string().min(1),
  cinematic_references:      z.string().min(1),
  // Rhythm Intelligence
  bpm:                       z.number().int().min(40).max(300),
  groove_behavior:           z.string().min(1),
  movement_energy:           z.string().min(1),
  percussion_complexity:     z.string().min(1),
  swing_characteristics:     z.string().min(1),
  // Harmonic Emotion System
  musical_key:               z.string().regex(/^[A-G][#b]?$/, 'Must be a valid musical key (A–G with optional # or b)'),
  scale:                     z.string().min(1),
  chord_behavior:            z.string().min(1),
  emotional_progression:     z.string().min(1),
  tension_release_behavior:  z.string().min(1),
  // Hook Strategy
  hook_intensity:            z.string().min(1),
  chant_potential:           z.string().min(1),
  replayability:             z.string().min(1),
  anthem_potential:          z.string().min(1),
  crowd_engagement_energy:   z.string().min(1),
  // Production Density (0–100)
  cinematic_density:         z.number().int().min(0).max(100),
  spiritual_intensity:       z.number().int().min(0).max(100),
  emotional_rawness:         z.number().int().min(0).max(100),
  commercial_accessibility:  z.number().int().min(0).max(100),
  darkness_vs_hope:          z.number().int().min(0).max(100),
  underground_vs_mainstream: z.number().int().min(0).max(100),
  organic_vs_synthetic:      z.number().int().min(0).max(100),
  // Assembly
  producer_brief:            z.string().min(1),
  coherence_score:           z.number().min(0).max(1),
});

export type SonicWorldOutputValidated = z.infer<typeof sonicWorldOutputSchema>;

const PREFERENCE_TYPES = ['liked', 'regenerated', 'exported', 'bookmarked'] as const;

export const recordPreferenceSchema = z.object({
  blueprint_id:    z.string().uuid(),
  artist_id:       z.string().uuid(),
  preference_type: z.enum(PREFERENCE_TYPES),
  metadata:        z.record(z.unknown()).optional(),
});

export const removePreferenceSchema = z.object({
  id: z.string().uuid(),
});

export type RecordPreferenceInput = z.infer<typeof recordPreferenceSchema>;
export type RemovePreferenceInput = z.infer<typeof removePreferenceSchema>;

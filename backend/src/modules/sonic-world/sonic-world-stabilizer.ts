import type { SonicWorldOutput } from './sonic-world-engine';

// ─── Types ───────────────────────────────────────────────────────────────────

export type GenerationQuality = 'excellent' | 'good' | 'fair' | 'poor';

export interface ValidationWarning {
  field: keyof SonicWorldOutput;
  issue: 'null_or_undefined' | 'empty_string' | 'undefined_pattern' | 'invalid_range' | 'invalid_enum' | 'nan_value';
  value?: unknown;
  expected?: string;
}

export interface ValidationReport {
  is_valid: boolean;
  warnings: ValidationWarning[];
  warning_count: number;
  checked_at: string;
}

export interface StabilizationMetadata {
  confidence_score: number;
  repair_count: number;
  fallback_used: boolean;
  generation_quality: GenerationQuality;
}

export interface StabilizationResult {
  raw_generation: SonicWorldOutput;
  repaired_generation: SonicWorldOutput;
  validation_report: ValidationReport;
  metadata: StabilizationMetadata;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const VALID_SCALES = [
  'Major', 'Minor', 'Dorian', 'Phrygian', 'Lydian', 'Mixolydian', 'Locrian',
  'Pentatonic Minor', 'Pentatonic Major', 'Blues', 'Chromatic',
];
const MUSICAL_KEY_PATTERN = /^[A-G][#b]?$/;

const STRING_FIELDS: (keyof SonicWorldOutput)[] = [
  'primary_genre', 'secondary_genre', 'rhythm_influence', 'sonic_fusion_identity',
  'drum_style', 'percussion_textures', 'bass_character', 'melodic_instruments',
  'ambient_layers', 'organic_synthetic_ratio',
  'vocal_texture', 'cadence_energy', 'harmony_behavior', 'emotional_intensity', 'vocal_atmosphere',
  'visual_sonic_atmosphere', 'emotional_weather', 'scene_energy', 'cinematic_references',
  'groove_behavior', 'movement_energy', 'percussion_complexity', 'swing_characteristics',
  'musical_key', 'scale', 'chord_behavior', 'emotional_progression', 'tension_release_behavior',
  'hook_intensity', 'chant_potential', 'replayability', 'anthem_potential', 'crowd_engagement_energy',
  'producer_brief',
];

const DENSITY_FIELDS: (keyof SonicWorldOutput)[] = [
  'cinematic_density', 'spiritual_intensity', 'emotional_rawness', 'commercial_accessibility',
  'darkness_vs_hope', 'underground_vs_mainstream', 'organic_vs_synthetic',
];

const FIELD_FALLBACKS: Record<keyof SonicWorldOutput, string | number> = {
  primary_genre:             'Contemporary R&B',
  secondary_genre:           'Soul Fusion',
  rhythm_influence:          'neo-soul groove',
  sonic_fusion_identity:     'eclectic soul-driven sound world',
  drum_style:                'mid-tempo trap with brushed snare',
  percussion_textures:       'subtle layered percussion',
  bass_character:            'warm melodic bass',
  melodic_instruments:       'piano and keys',
  ambient_layers:            'soft synth pads',
  organic_synthetic_ratio:   '50% organic / 50% synthetic',
  vocal_texture:             'smooth and expressive',
  cadence_energy:            'flowing mid-tempo delivery',
  harmony_behavior:          'gentle background harmonies',
  emotional_intensity:       'controlled emotional range',
  vocal_atmosphere:          'intimate and present',
  visual_sonic_atmosphere:   'cinematic urban landscape',
  emotional_weather:         'overcast with moments of light',
  scene_energy:              'steady and introspective',
  cinematic_references:      'contemporary cinematic palette',
  bpm:                       90,
  groove_behavior:           'steady mid-tempo pocket',
  movement_energy:           'subtle body sway',
  percussion_complexity:     'moderate layered complexity',
  swing_characteristics:     'slight humanized swing',
  musical_key:               'C',
  scale:                     'Minor',
  chord_behavior:            'i–VII–VI–VII with melodic movement',
  emotional_progression:     'builds gradually with emotional arc',
  tension_release_behavior:  'measured tension with chorus release',
  hook_intensity:            'memorable and accessible',
  chant_potential:           'moderate singalong potential',
  replayability:             'high emotional attachment replay value',
  anthem_potential:          'community resonance with replay depth',
  crowd_engagement_energy:   'connected audience energy',
  cinematic_density:         50,
  spiritual_intensity:       50,
  emotional_rawness:         50,
  commercial_accessibility:  50,
  darkness_vs_hope:          50,
  underground_vs_mainstream: 50,
  organic_vs_synthetic:      50,
  producer_brief:            'A soulful mid-tempo production with balanced instrumentation and emotional depth.',
  coherence_score:           0.85,
};

// ─── Narrative Repair ─────────────────────────────────────────────────────────

const UNDEFINED_PREFIX_RE = /^undefined\s*[-–—]\s*/i;
const UNDEFINED_WORD_RE   = /\bundefined\b/gi;
const NULL_WORD_RE        = /\bnull\b/gi;
const LEADING_DASH_RE     = /^\s*[-–—]\s*/;
const MULTI_SPACE_RE      = /\s{2,}/g;

export function repairSonicNarrative(
  value: unknown,
  fallback: string,
): { value: string; repaired: boolean } {
  if (value == null || typeof value !== 'string') {
    return { value: fallback, repaired: true };
  }

  let out = value;
  let changed = false;

  if (UNDEFINED_PREFIX_RE.test(out)) { out = out.replace(UNDEFINED_PREFIX_RE, ''); changed = true; }
  if (UNDEFINED_WORD_RE.test(out))   { out = out.replace(UNDEFINED_WORD_RE, '');   changed = true; }
  if (NULL_WORD_RE.test(out))        { out = out.replace(NULL_WORD_RE, '');         changed = true; }

  if (changed) {
    out = out.replace(LEADING_DASH_RE, '').replace(MULTI_SPACE_RE, ' ').trim();
  }

  if (!out) return { value: fallback, repaired: true };
  return { value: out, repaired: changed };
}

// ─── Validation ──────────────────────────────────────────────────────────────

export function validateSonicWorld(output: SonicWorldOutput): ValidationReport {
  const warnings: ValidationWarning[] = [];

  const warn = (
    field: keyof SonicWorldOutput,
    issue: ValidationWarning['issue'],
    value?: unknown,
    expected?: string,
  ) => warnings.push({ field, issue, value, expected });

  for (const field of STRING_FIELDS) {
    const val = output[field];
    if (val == null) {
      warn(field, 'null_or_undefined', val);
      continue;
    }
    if (typeof val === 'string') {
      if (val.trim() === '') {
        warn(field, 'empty_string', val);
        continue;
      }
      if (/\bundefined\b/i.test(val) || /\bnull\b/i.test(val)) {
        warn(field, 'undefined_pattern', val);
      }
    }
  }

  if (output.musical_key && !MUSICAL_KEY_PATTERN.test(output.musical_key)) {
    warn('musical_key', 'invalid_enum', output.musical_key, 'A–G with optional # or b');
  }

  if (output.scale && !VALID_SCALES.some(s => s.toLowerCase() === output.scale?.toLowerCase())) {
    warn('scale', 'invalid_enum', output.scale, VALID_SCALES.join(' | '));
  }

  if (output.bpm == null || isNaN(output.bpm)) {
    warn('bpm', 'nan_value', output.bpm, '40–300');
  } else if (output.bpm < 40 || output.bpm > 300) {
    warn('bpm', 'invalid_range', output.bpm, '40–300');
  }

  if (output.coherence_score == null || isNaN(output.coherence_score)) {
    warn('coherence_score', 'nan_value', output.coherence_score, '0.0–1.0');
  } else if (output.coherence_score < 0 || output.coherence_score > 1) {
    warn('coherence_score', 'invalid_range', output.coherence_score, '0.0–1.0');
  }

  for (const field of DENSITY_FIELDS) {
    const val = output[field] as number;
    if (val == null || isNaN(val)) {
      warn(field, 'nan_value', val, '0–100');
    } else if (val < 0 || val > 100) {
      warn(field, 'invalid_range', val, '0–100');
    }
  }

  return {
    is_valid:      warnings.length === 0,
    warnings,
    warning_count: warnings.length,
    checked_at:    new Date().toISOString(),
  };
}

// ─── Quality Scoring ─────────────────────────────────────────────────────────

function resolveQuality(repairCount: number, fallbackUsed: boolean, confidenceScore: number): GenerationQuality {
  if (confidenceScore >= 0.90 && repairCount === 0 && !fallbackUsed) return 'excellent';
  if (confidenceScore >= 0.70 && repairCount <= 2)                   return 'good';
  if (confidenceScore >= 0.50 && repairCount <= 5)                   return 'fair';
  return 'poor';
}

// ─── Stabilizer ──────────────────────────────────────────────────────────────

export function stabilizeSonicWorld(raw: SonicWorldOutput): StabilizationResult {
  const raw_generation: SonicWorldOutput = { ...raw };
  const validation_report = validateSonicWorld(raw);

  let repair_count = 0;
  let fallback_used = false;
  const repaired: Record<string, unknown> = { ...raw };

  // Repair string narrative fields
  for (const field of STRING_FIELDS) {
    const current = raw[field];
    const fallback = String(FIELD_FALLBACKS[field]);
    const result = repairSonicNarrative(current, fallback);
    if (result.repaired) {
      repaired[field] = result.value;
      repair_count++;
      if (current == null || (typeof current === 'string' && current.trim() === '')) {
        fallback_used = true;
      }
    }
  }

  // Repair BPM
  const rawBpm = raw.bpm;
  if (rawBpm == null || isNaN(rawBpm) || rawBpm < 40 || rawBpm > 300) {
    repaired.bpm = FIELD_FALLBACKS.bpm as number;
    repair_count++;
    fallback_used = true;
  }

  // Repair coherence_score
  const rawCoherence = raw.coherence_score;
  if (rawCoherence == null || isNaN(rawCoherence)) {
    repaired.coherence_score = FIELD_FALLBACKS.coherence_score as number;
    repair_count++;
    fallback_used = true;
  } else {
    repaired.coherence_score = parseFloat(Math.max(0, Math.min(1, rawCoherence)).toFixed(2));
  }

  // Repair density fields (clamp to 0–100)
  for (const field of DENSITY_FIELDS) {
    const val = raw[field] as number;
    if (val == null || isNaN(val)) {
      repaired[field] = FIELD_FALLBACKS[field] as number;
      repair_count++;
      fallback_used = true;
    } else if (val < 0 || val > 100) {
      repaired[field] = Math.max(0, Math.min(100, val));
      repair_count++;
    }
  }

  const confidence_score = parseFloat(
    Math.max(0, Math.min(1, 1.0 - repair_count * 0.05 - (fallback_used ? 0.20 : 0))).toFixed(2),
  );

  return {
    raw_generation,
    repaired_generation: repaired as unknown as SonicWorldOutput,
    validation_report,
    metadata: {
      confidence_score,
      repair_count,
      fallback_used,
      generation_quality: resolveQuality(repair_count, fallback_used, confidence_score),
    },
  };
}

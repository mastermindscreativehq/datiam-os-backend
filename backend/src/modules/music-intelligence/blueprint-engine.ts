export type EmotionType =
  | 'grief' | 'trauma' | 'rage' | 'joy' | 'melancholy' | 'euphoria'
  | 'anxiety' | 'longing' | 'triumph' | 'nostalgia' | 'peace' | 'defiance';

export type IntentionType =
  | 'heal_listener' | 'inspire_action' | 'create_nostalgia' | 'deliver_message'
  | 'uplift_spirit' | 'provoke_thought' | 'celebrate_truth' | 'process_pain';

export type TransformationType =
  | 'from_pain_to_peace' | 'from_stagnation_to_momentum' | 'from_confusion_to_clarity'
  | 'from_isolation_to_belonging' | 'from_fear_to_courage' | 'from_grief_to_acceptance'
  | 'from_doubt_to_conviction' | 'from_chaos_to_order';

export interface BlueprintInput {
  emotion: EmotionType;
  intention: IntentionType;
  story?: string | null;
  listener_transformation: TransformationType;
}

export interface BlueprintOutput {
  bpm: number;
  musical_key: string;
  scale: string;
  atmosphere: string;
  cadence_energy: string;
  chord_direction: string;
  vocal_energy: string;
  hook_intensity: string;
}

// ---- Deterministic hash for story-based variance ----
function storyHash(story: string | null | undefined): number {
  const s = story ?? '';
  if (s.length === 0) return 0;
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = ((h * 31) + s.charCodeAt(i)) >>> 0;
  }
  return h;
}

function pick<T>(arr: T[], hash: number): T {
  return arr[hash % arr.length];
}

function clampBpm(bpm: number): number {
  return Math.max(40, Math.min(200, Math.round(bpm)));
}

// ---- Emotion base lookup ----

interface EmotionBase {
  bpmMin: number;
  bpmMax: number;
  keys: string[];
  scale: string;
  atmosphere: string;
  cadenceEnergy: string;
  chordDirection: string;
  vocalEnergy: string;
  hookIntensity: string;
}

const EMOTION_BASE: Record<EmotionType, EmotionBase> = {
  grief: {
    bpmMin: 55, bpmMax: 70,
    keys: ['C minor', 'Bb minor', 'D minor'],
    scale: 'natural minor',
    atmosphere: 'sparse and sorrowful',
    cadenceEnergy: 'slow and weighted',
    chordDirection: 'descending minor progression',
    vocalEnergy: 'whispered and vulnerable',
    hookIntensity: 'quietly devastating refrain',
  },
  trauma: {
    bpmMin: 48, bpmMax: 65,
    keys: ['D minor', 'G minor', 'F# minor'],
    scale: 'phrygian',
    atmosphere: 'haunted and fractured',
    cadenceEnergy: 'fragmented and unstable',
    chordDirection: 'unstable diminished and chromatic shifts',
    vocalEnergy: 'strained and fractured',
    hookIntensity: 'fragmented repetition',
  },
  rage: {
    bpmMin: 128, bpmMax: 155,
    keys: ['E minor', 'A minor', 'D minor'],
    scale: 'harmonic minor',
    atmosphere: 'raw and volatile',
    cadenceEnergy: 'aggressive and propulsive',
    chordDirection: 'driving power chord movement',
    vocalEnergy: 'raw and forceful',
    hookIntensity: 'explosive and cathartic drop',
  },
  joy: {
    bpmMin: 96, bpmMax: 128,
    keys: ['G major', 'D major', 'A major'],
    scale: 'major',
    atmosphere: 'bright and expansive',
    cadenceEnergy: 'light and bouncing',
    chordDirection: 'rising major resolution',
    vocalEnergy: 'light and playful',
    hookIntensity: 'infectious and uplifting chorus',
  },
  melancholy: {
    bpmMin: 60, bpmMax: 80,
    keys: ['A minor', 'E minor', 'D minor'],
    scale: 'dorian',
    atmosphere: 'reflective and subdued',
    cadenceEnergy: 'gentle and flowing',
    chordDirection: 'wandering minor to relative major',
    vocalEnergy: 'soft and introspective',
    hookIntensity: 'achingly memorable phrase',
  },
  euphoria: {
    bpmMin: 118, bpmMax: 140,
    keys: ['E major', 'B major', 'A major'],
    scale: 'lydian',
    atmosphere: 'radiant and euphoric',
    cadenceEnergy: 'soaring and breathless',
    chordDirection: 'climbing lydian ascent',
    vocalEnergy: 'soaring and full-bodied',
    hookIntensity: 'overwhelming peak moment',
  },
  anxiety: {
    bpmMin: 88, bpmMax: 112,
    keys: ['F# minor', 'B minor', 'C# minor'],
    scale: 'phrygian',
    atmosphere: 'tense and relentless',
    cadenceEnergy: 'erratic and forward-driving',
    chordDirection: 'unresolved leading tone tension',
    vocalEnergy: 'urgent and breathless',
    hookIntensity: 'urgent and unavoidable hook',
  },
  longing: {
    bpmMin: 65, bpmMax: 84,
    keys: ['G minor', 'C minor', 'F minor'],
    scale: 'dorian',
    atmosphere: 'yearning and suspended',
    cadenceEnergy: 'suspended and pulling',
    chordDirection: 'suspended fourth with unresolved cadence',
    vocalEnergy: 'searching and tender',
    hookIntensity: 'bittersweet and reaching',
  },
  triumph: {
    bpmMin: 88, bpmMax: 116,
    keys: ['C major', 'G major', 'F major'],
    scale: 'major',
    atmosphere: 'powerful and ascending',
    cadenceEnergy: 'steady and building',
    chordDirection: 'bold major cadences with full resolution',
    vocalEnergy: 'powerful and declarative',
    hookIntensity: 'anthemic declaration',
  },
  nostalgia: {
    bpmMin: 72, bpmMax: 90,
    keys: ['F major', 'C major', 'G major'],
    scale: 'mixolydian',
    atmosphere: 'warm and bittersweet',
    cadenceEnergy: 'rolling and reminiscent',
    chordDirection: 'major with flatted seventh echo',
    vocalEnergy: 'warm and reminiscent',
    hookIntensity: 'familiar and resonant',
  },
  peace: {
    bpmMin: 52, bpmMax: 72,
    keys: ['D major', 'A major', 'G major'],
    scale: 'major',
    atmosphere: 'still and luminous',
    cadenceEnergy: 'unhurried and grounded',
    chordDirection: 'open major triads with gentle movement',
    vocalEnergy: 'gentle and centered',
    hookIntensity: 'serene and resolving',
  },
  defiance: {
    bpmMin: 92, bpmMax: 132,
    keys: ['B minor', 'F# minor', 'E minor'],
    scale: 'harmonic minor',
    atmosphere: 'bold and unrelenting',
    cadenceEnergy: 'forceful and unwavering',
    chordDirection: 'minor driving to unexpected major shift',
    vocalEnergy: 'grounded and unapologetic',
    hookIntensity: 'unmistakable battle cry',
  },
};

// ---- Intention modifiers ----

interface IntentionMod {
  bpmDelta: number;
  vocalSuffix: string;
  hookSuffix: string;
  atmosphereSuffix?: string;
}

const INTENTION_MOD: Record<IntentionType, IntentionMod> = {
  heal_listener:    { bpmDelta: -8,  vocalSuffix: ', intimate and honest',       hookSuffix: ' — intimate resolution' },
  inspire_action:   { bpmDelta: +15, vocalSuffix: ', declarative and strong',    hookSuffix: ' — rallying crescendo',   atmosphereSuffix: ', ignited' },
  create_nostalgia: { bpmDelta: -5,  vocalSuffix: ', warm and recalling',         hookSuffix: ' — familiar echo' },
  deliver_message:  { bpmDelta: 0,   vocalSuffix: ', direct and clear',           hookSuffix: ' — direct and unavoidable' },
  uplift_spirit:    { bpmDelta: +10, vocalSuffix: ', expansive and hopeful',      hookSuffix: ' — transcendent peak',    atmosphereSuffix: ', uplifted' },
  provoke_thought:  { bpmDelta: -3,  vocalSuffix: ', questioning and deliberate', hookSuffix: ' — lingering question' },
  celebrate_truth:  { bpmDelta: +12, vocalSuffix: ', joyful and free',            hookSuffix: ' — exultant release',     atmosphereSuffix: ', celebratory' },
  process_pain:     { bpmDelta: -6,  vocalSuffix: ', raw and releasing',           hookSuffix: ' — cathartic release' },
};

// ---- Transformation modifiers ----

interface TransformationMod {
  bpmDelta?: number;
  chordSuffix?: string;
  cadenceOverride?: string;
  hookSuffix?: string;
  atmosphereSuffix?: string;
}

const TRANSFORMATION_MOD: Record<TransformationType, TransformationMod> = {
  from_pain_to_peace:          { chordSuffix: ' → resolving to major tonic',           cadenceOverride: 'beginning weighted, gradually releasing' },
  from_stagnation_to_momentum: { bpmDelta: +12,                                         cadenceOverride: 'building from stillness to propulsive drive' },
  from_confusion_to_clarity:   { chordSuffix: ' → landing on clear tonic resolution' },
  from_isolation_to_belonging: { atmosphereSuffix: ', communal and shared' },
  from_fear_to_courage:        { bpmDelta: +10, chordSuffix: ' → ascending to resolution' },
  from_grief_to_acceptance:    { chordSuffix: ' → ending on major tonic' },
  from_doubt_to_conviction:    { hookSuffix: ', unwavering affirmation' },
  from_chaos_to_order:         { cadenceOverride: 'erratic tension resolving to metronomic order' },
};

// ---- Engine ----

export function computeBlueprint(input: BlueprintInput): BlueprintOutput {
  const base = EMOTION_BASE[input.emotion];
  const intentionMod = INTENTION_MOD[input.intention];
  const transformMod = TRANSFORMATION_MOD[input.listener_transformation];
  const hash = storyHash(input.story);

  // BPM: base range + intention delta + transformation delta, then clamp
  const bpmBase = base.bpmMin + (hash % (base.bpmMax - base.bpmMin + 1));
  const bpmRaw = bpmBase + intentionMod.bpmDelta + (transformMod.bpmDelta ?? 0);
  const bpm = clampBpm(bpmRaw);

  // Key: deterministic pick from emotion's key list, varied by story hash
  const musical_key = pick(base.keys, hash);

  // Scale: base (transformations don't override scale in v1)
  const scale = base.scale;

  // Atmosphere: base + optional intention suffix + optional transformation suffix
  const atmosphere =
    base.atmosphere +
    (intentionMod.atmosphereSuffix ?? '') +
    (transformMod.atmosphereSuffix ?? '');

  // Cadence energy: transformation can override entirely, otherwise use base
  const cadence_energy = transformMod.cadenceOverride ?? base.cadenceEnergy;

  // Chord direction: base + optional transformation suffix
  const chord_direction = base.chordDirection + (transformMod.chordSuffix ?? '');

  // Vocal energy: base + intention suffix
  const vocal_energy = base.vocalEnergy + intentionMod.vocalSuffix;

  // Hook intensity: base + intention suffix + optional transformation suffix
  const hook_intensity =
    base.hookIntensity +
    intentionMod.hookSuffix +
    (transformMod.hookSuffix ?? '');

  return {
    bpm,
    musical_key,
    scale,
    atmosphere,
    cadence_energy,
    chord_direction,
    vocal_energy,
    hook_intensity,
  };
}

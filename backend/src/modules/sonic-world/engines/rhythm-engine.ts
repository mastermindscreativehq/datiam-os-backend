import type { EmotionType, TransformationType, SonicWorldInput } from '../sonic-world.types';

export interface RhythmIntelligenceOutput {
  bpm: number;
  groove_behavior: string;
  movement_energy: string;
  percussion_complexity: string;
  swing_characteristics: string;
}

interface RhythmBase {
  grooveBehaviors:        string[];
  movementEnergies:       string[];
  percussionComplexities: string[];
  swingCharacteristics:   string[];
}

const EMOTION_RHYTHM_BASE: Record<EmotionType, RhythmBase> = {
  grief: {
    grooveBehaviors:        ['laid far back behind the beat', 'settled and heavy with no urgency', 'slow drag — refusing to rush'],
    movementEnergies:       ['head-bowing downward weight', 'stillness more than movement', 'rocking slowly'],
    percussionComplexities: ['minimal — every hit matters', 'sparse and intentional', 'two elements maximum'],
    swingCharacteristics:   ['heavy slow swing — walking through water', 'dragging shuffle feel', 'organic delayed swing'],
  },
  trauma: {
    grooveBehaviors:        ['unstable — falls apart and reforms', 'rhythmically fractured', 'glitched groove that resists resolution'],
    movementEnergies:       ['jerky and unpredictable', 'frozen then sudden motion', 'dissociative body movement'],
    percussionComplexities: ['complex but feels broken', 'layered then suddenly dropped', 'polyrhythmic disorder'],
    swingCharacteristics:   ['straight then suddenly off-grid', 'quantized but wrong', 'purposeful rhythmic disorientation'],
  },
  rage: {
    grooveBehaviors:        ['aggressively on top of the beat', 'driving forward with no yield', 'punishing and relentless'],
    movementEnergies:       ['head-nodding hard — full body', 'mosh energy', 'forward march momentum'],
    percussionComplexities: ['dense and overwhelming', 'layered hard percussion', 'full assault'],
    swingCharacteristics:   ['straight quantized — machine precision', 'no swing — pure power', 'locked to the grid'],
  },
  joy: {
    grooveBehaviors:        ['slightly behind — easy and natural', 'bouncing on top with lightness', 'organic pocket groove'],
    movementEnergies:       ['full body swaying', 'dancing without thinking', 'light skipping energy'],
    percussionComplexities: ['medium — feels busy but natural', 'syncopated and alive', 'danceable complexity'],
    swingCharacteristics:   ['natural swing feel — 55%', 'humanized bounce', 'loose and joyful swing'],
  },
  melancholy: {
    grooveBehaviors:        ['slightly behind — contemplative', 'unhurried and accepting', 'mellow groove that breathes'],
    movementEnergies:       ['gentle sway', 'slow nodding', 'movement that barely exists'],
    percussionComplexities: ['moderate — present but never demanding', 'unobtrusive and supportive', 'simple and warm'],
    swingCharacteristics:   ['soft swing feel', 'lo-fi humanized timing', 'gentle imperfection'],
  },
  euphoria: {
    grooveBehaviors:        ['perfectly on the beat — locked in', 'driving forward with ecstasy', 'relentless forward motion'],
    movementEnergies:       ['hands in the air', 'full abandon dancing', 'losing yourself in the beat'],
    percussionComplexities: ['complex and layered', 'builds to maximum density at peak', 'electronic precision'],
    swingCharacteristics:   ['straight and mechanical', 'perfect electronic quantize', 'programmed precision'],
  },
  anxiety: {
    grooveBehaviors:        ['urgently on top of the beat', 'rushing forward unstoppably', "can't settle into a groove"],
    movementEnergies:       ['nervous foot tapping', 'restless body energy', 'bouncing knee pacing'],
    percussionComplexities: ['dense and relentless', 'hi-hat overloaded', 'nervous over-complexity'],
    swingCharacteristics:   ['tight and rushed', 'slightly ahead of the beat', 'quantized urgency'],
  },
  longing: {
    grooveBehaviors:        ['gently behind the beat — reaching backward', 'suspended and yearning', 'slow pull toward the future'],
    movementEnergies:       ['slow swaying — reaching out', 'eyes-closed body movement', 'gentle tide energy'],
    percussionComplexities: ['sparse — creates space for longing', 'minimal and supportive', 'breath-like percussion'],
    swingCharacteristics:   ['loose organic swing', 'natural humanized timing', 'soul groove feel'],
  },
  triumph: {
    grooveBehaviors:        ['on the beat — commanding', 'steady march energy', 'powerful and certain'],
    movementEnergies:       ['heads raised fists pumping', 'marching forward energy', 'upward body movement'],
    percussionComplexities: ['full and orchestral', 'complex with cinematic weight', 'building density'],
    swingCharacteristics:   ['straight but powerful', 'march groove feel', 'locked and authoritative'],
  },
  nostalgia: {
    grooveBehaviors:        ['behind the beat — warm and relaxed', 'classic boom bap pocket', 'old school laid-back groove'],
    movementEnergies:       ['head-nodding backward lean', 'smooth two-step', 'classic hip-hop lean'],
    percussionComplexities: ['moderate boom bap complexity', 'sampled break feel', 'classic hip-hop groove'],
    swingCharacteristics:   ['heavy classic swing — MPC feel', 'golden era hip-hop timing', '60% swing humanization'],
  },
  peace: {
    grooveBehaviors:        ['gently behind the beat — unhurried', 'floating above the pulse', 'meditation-tempo groove'],
    movementEnergies:       ['swaying like tall grass', 'barely moving — present', 'breath-synchronized movement'],
    percussionComplexities: ['minimal — almost absent', 'single element rhythm', 'percussive breathing'],
    swingCharacteristics:   ['loose and natural', 'organic and breathing', 'no rigid timing'],
  },
  defiance: {
    grooveBehaviors:        ['on the beat — immovable', 'rhythmic march energy', 'locked and unwavering'],
    movementEnergies:       ['marching energy', 'chest-out stride', 'stomping forward movement'],
    percussionComplexities: ['medium-high — forceful', 'layered for impact', 'intentional power complexity'],
    swingCharacteristics:   ['controlled swing', 'slight hip-hop lean', 'purposeful human feel'],
  },
};

const TRANSFORMATION_MOVEMENT_MODIFIER: Record<TransformationType, string> = {
  from_pain_to_peace:          'shifts from heavy drag to gentle float',
  from_stagnation_to_momentum: 'begins frozen then accelerates',
  from_confusion_to_clarity:   'erratic at first then snaps into pocket',
  from_isolation_to_belonging: 'individual pulse merges with collective groove',
  from_fear_to_courage:        'tentative then builds to confident stride',
  from_grief_to_acceptance:    'weighted drag slowly lightens over time',
  from_doubt_to_conviction:    'hesitant rhythm locks into certainty',
  from_chaos_to_order:         'irregular then resolves to metronomic precision',
};

function pick<T>(arr: T[], hash: number): T {
  return arr[hash % arr.length];
}

export function computeRhythmIntelligence(input: SonicWorldInput, hash: number): RhythmIntelligenceOutput {
  const base          = EMOTION_RHYTHM_BASE[input.emotion];
  const movementMod   = TRANSFORMATION_MOVEMENT_MODIFIER[input.listener_transformation];
  const baseMovement  = pick(base.movementEnergies, hash ^ 0x55);

  return {
    bpm:                   input.bpm,
    groove_behavior:       pick(base.grooveBehaviors,        hash),
    movement_energy:       `${baseMovement} — ${movementMod}`,
    percussion_complexity: pick(base.percussionComplexities, hash ^ 0x66),
    swing_characteristics: pick(base.swingCharacteristics,   hash ^ 0x77),
  };
}

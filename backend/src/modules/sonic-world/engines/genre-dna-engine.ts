import type { EmotionType, IntentionType, TransformationType, SonicWorldInput } from '../sonic-world.types';

export interface GenreDNAOutput {
  primary_genre: string;
  secondary_genre: string;
  rhythm_influence: string;
  sonic_fusion_identity: string;
}

const EMOTION_PRIMARY_GENRE: Record<EmotionType, string> = {
  grief:      'Dark Soul',
  trauma:     'Experimental R&B',
  rage:       'Trap / Drill',
  joy:        'Afrobeats / Pop',
  melancholy: 'Indie R&B',
  euphoria:   'Dance Electronic',
  anxiety:    'UK Bass / Glitch',
  longing:    'Alternative Soul',
  triumph:    'Epic Hip-Hop',
  nostalgia:  'Golden Era Hip-Hop',
  peace:      'Ambient Neo-Soul',
  defiance:   'Conscious Trap',
};

const EMOTION_RHYTHM_INFLUENCES: Record<EmotionType, string[]> = {
  grief:      ['neo-soul rhythm', 'ambient soul pulse', 'half-time soul groove'],
  trauma:     ['glitch rhythm', 'broken beat pattern', 'stuttered soul loop'],
  rage:       ['trap 808 pattern', 'afro drill rhythm', 'industrial percussion drive'],
  joy:        ['afrobeats pulse', 'dancehall swing', 'bounce groove'],
  melancholy: ['bedroom pop pulse', 'lo-fi soul beat', 'indie folk rhythm'],
  euphoria:   ['progressive house kick', 'synth pop pulse', 'future bass rhythm'],
  anxiety:    ['glitch hop pattern', 'UK garage skip', 'erratic trap loop'],
  longing:    ['downtempo swing', 'neo-soul groove', 'organic folk pulse'],
  triumph:    ['cinematic hip-hop boom', 'gospel march pattern', 'boom bap drive'],
  nostalgia:  ['boom bap swing', 'classic soul groove', 'golden era hip-hop lilt'],
  peace:      ['ambient pulse', 'neo-classical flow', 'chill R&B drift'],
  defiance:   ['conscious hip-hop drive', 'trap soul rhythm', 'drill impact'],
};

const INTENTION_SECONDARY_GENRE: Record<IntentionType, string> = {
  heal_listener:    'Bedroom R&B',
  inspire_action:   'Anthemic Hip-Hop',
  create_nostalgia: 'Retro Soul Fusion',
  deliver_message:  'Spoken Word Hip-Hop',
  uplift_spirit:    'Gospel-Influenced R&B',
  provoke_thought:  'Art Rap / Jazz Rap',
  celebrate_truth:  'Celebration Trap',
  process_pain:     'Blues Hip-Hop',
};

const TRANSFORMATION_FUSION_QUALITY: Record<TransformationType, string> = {
  from_pain_to_peace:          'cathartic release',
  from_stagnation_to_momentum: 'kinetic awakening',
  from_confusion_to_clarity:   'crystalline focus',
  from_isolation_to_belonging: 'communal warmth',
  from_fear_to_courage:        'bold ascension',
  from_grief_to_acceptance:    'transcendent healing',
  from_doubt_to_conviction:    'unwavering declaration',
  from_chaos_to_order:         'structured emergence',
};

function pick<T>(arr: T[], hash: number): T {
  return arr[hash % arr.length];
}

export function computeGenreDNA(input: SonicWorldInput, hash: number): GenreDNAOutput {
  const primary        = EMOTION_PRIMARY_GENRE[input.emotion];
  const secondary      = INTENTION_SECONDARY_GENRE[input.intention];
  const rhythmInfluence = pick(EMOTION_RHYTHM_INFLUENCES[input.emotion], hash);
  const fusionQuality  = TRANSFORMATION_FUSION_QUALITY[input.listener_transformation];

  return {
    primary_genre:         primary,
    secondary_genre:       secondary,
    rhythm_influence:      rhythmInfluence,
    sonic_fusion_identity: `${primary} with ${secondary.toLowerCase()} undercurrent — a ${fusionQuality} sound world`,
  };
}

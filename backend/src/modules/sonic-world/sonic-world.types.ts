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

export interface SonicWorldInput {
  emotion: EmotionType;
  intention: IntentionType;
  listener_transformation: TransformationType;
  story?: string | null;
  bpm: number;
  musical_key: string;
  scale: string;
  atmosphere: string;
  cadence_energy: string;
  chord_direction: string;
  vocal_energy: string;
  hook_intensity: string;
}

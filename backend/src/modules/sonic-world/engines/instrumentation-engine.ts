import type { EmotionType, IntentionType, SonicWorldInput } from '../sonic-world.types';

export interface InstrumentationOutput {
  drum_style: string;
  percussion_textures: string;
  bass_character: string;
  melodic_instruments: string;
  ambient_layers: string;
  organic_synthetic_ratio: string;
}

interface InstrumentationBase {
  drums:      string[];
  percussion: string[];
  bass:       string[];
  melodic:    string[];
  ambient:    string[];
  ratio:      string;
}

const EMOTION_INSTRUMENTATION: Record<EmotionType, InstrumentationBase> = {
  grief: {
    drums:      ['sparse kick with brushed snare', 'ghost-note trap kit at half-time', 'minimal 808 with open breath'],
    percussion: ['finger snaps', 'brushed tambourine', 'subtle rim taps'],
    bass:       ['sub 808 with long decay', 'fretless bass with vibrato', 'sustained sub drone'],
    melodic:    ['Rhodes piano', 'acoustic guitar arpeggios', 'solo cello'],
    ambient:    ['deep reverb pads', 'granular breath textures', 'low string swells'],
    ratio:      '60% organic / 40% synthetic',
  },
  trauma: {
    drums:      ['fractured trap hi-hats', 'glitch snare with stutter', 'distorted 808 hits'],
    percussion: ['reversed claps', 'vinyl crackle layers', 'industrial metal hits'],
    bass:       ['distorted sub bass', 'pitched 808 drops', 'deep rumbling sub'],
    melodic:    ['detuned prepared piano', 'manipulated vocal chops', 'lo-fi guitar fragments'],
    ambient:    ['eerie string clusters', 'pitched-down voice samples', 'noise feedback loops'],
    ratio:      '30% organic / 70% synthetic',
  },
  rage: {
    drums:      ['hard trap 808 with snapping snare', 'aggressive hi-hat rolls', 'drill-style percussion'],
    percussion: ['metal clangs', 'industrial impact hits', 'hard stacked claps'],
    bass:       ['aggressive 808 slides', 'distorted sub bass', 'punishing kick-bass lock'],
    melodic:    ['sampled guitar stabs', 'minor piano stabs', 'tense string jabs'],
    ambient:    ['dark atmospheric pads', 'low brass stabs', 'crowd noise layers'],
    ratio:      '25% organic / 75% synthetic',
  },
  joy: {
    drums:      ['live drum kit with swing feel', 'afrobeats percussion pattern', 'bouncy trap with rim shots'],
    percussion: ['shakers', 'cowbells', 'afro hand drums'],
    bass:       ['warm bass guitar groove', 'bouncy plucked bass', 'afrobeats bass riff'],
    melodic:    ['bright acoustic guitar', 'organ and keys', 'brass stabs'],
    ambient:    ['airy synth chord stabs', 'layered vocal harmonies', 'light string swells'],
    ratio:      '65% organic / 35% synthetic',
  },
  melancholy: {
    drums:      ['soft trap hi-hats', 'lo-fi drum samples', 'brushed snare at mid-tempo'],
    percussion: ['light tambourine shake', 'dusty vinyl crackle', 'quiet rim taps'],
    bass:       ['warm sub bass', 'gentle bass melody', 'laid-back bass groove'],
    melodic:    ['lo-fi Rhodes electric piano', 'clean electric guitar', 'intimate upright piano'],
    ambient:    ['warm vinyl-textured pads', 'light string swells', 'tape hiss ambience'],
    ratio:      '55% organic / 45% synthetic',
  },
  euphoria: {
    drums:      ['tight house kick', 'syncopated electronic snare', 'layered electronic percussion'],
    percussion: ['electronic clap shots', 'tight hi-hat sequences', 'electronic tambourine chops'],
    bass:       ['punchy synth bass', 'driving sidechain bass', 'four-on-the-floor bass lock'],
    melodic:    ['lush synth leads', 'bright arpeggiators', 'vocal chop sequences'],
    ambient:    ['euphoric pad washes', 'shimmering reverb tails', 'shimmer delay effects'],
    ratio:      '20% organic / 80% synthetic',
  },
  anxiety: {
    drums:      ['erratic hi-hat patterns', 'glitched snare hits', 'nervous trap percussion'],
    percussion: ['ticking metallic percussion', 'stuttered claps', 'reverse cymbal hits'],
    bass:       ['tense staccato bass', 'rising bass fills', 'unresolved bass movement'],
    melodic:    ['pizzicato string stabs', 'offbeat piano hits', 'minor key synth arpeggios'],
    ambient:    ['tense drone pads', 'building string textures', 'low-end rumble'],
    ratio:      '35% organic / 65% synthetic',
  },
  longing: {
    drums:      ['brushed snare with swing', 'minimal hi-hat pulse', 'slow half-time kick'],
    percussion: ['soft hand percussion', 'light brushed cymbals', 'gentle shakers'],
    bass:       ['melodic bass movement', 'warm bass fills', 'gentle sub pulse'],
    melodic:    ['acoustic guitar fingerpicking', 'Rhodes with chorus', 'breathy flute or oboe'],
    ambient:    ['soft string swells', 'reverb-soaked synth pads', 'airy vocal textures'],
    ratio:      '60% organic / 40% synthetic',
  },
  triumph: {
    drums:      ['powerful snare hits', 'orchestral-influenced drum kit', 'booming 808'],
    percussion: ['orchestral timpani hits', 'epic snare rolls', 'layered clap stack'],
    bass:       ['powerful bass riff', 'low brass + bass combo', 'driving bass foundation'],
    melodic:    ['epic brass section stabs', 'piano power chords', 'choir string pads'],
    ambient:    ['orchestral string swells', 'choir pads', 'epic reverb tails'],
    ratio:      '50% organic / 50% synthetic',
  },
  nostalgia: {
    drums:      ['boom bap pattern with swing', 'sampled drum break', 'dusty lo-fi kit'],
    percussion: ['vinyl record scratches', 'old-school hi-hat chops', 'sampled claps'],
    bass:       ['sampled bass loop', 'warm jazz bass groove', 'smooth bass line'],
    melodic:    ['soul sample chops', 'vintage keys and organ', 'melodic brass samples'],
    ambient:    ['vinyl crackle layer', 'tape saturation warmth', 'warm analog pad'],
    ratio:      '70% organic / 30% synthetic',
  },
  peace: {
    drums:      ['feather-light brushed kit', 'minimal kick pulse', 'open hi-hat swing'],
    percussion: ['wind chimes', 'soft bells', 'gentle hand drum'],
    bass:       ['acoustic bass breath', 'soft sub pulse', 'gentle melodic bass'],
    melodic:    ['acoustic grand piano', 'classical guitar', 'smooth saxophone or flute'],
    ambient:    ['nature sound textures', 'soft string harmonics', 'light synth breath pad'],
    ratio:      '75% organic / 25% synthetic',
  },
  defiance: {
    drums:      ['hard-hitting trap with strong snare', 'boom bap foundation', 'aggressive hi-hat'],
    percussion: ['hard stacked clap layers', 'metallic impact hits', 'audience stomp effect'],
    bass:       ['heavy 808 movement', 'hard driving bass', 'low-end power sub'],
    melodic:    ['minor key guitar riffs', 'dark piano chords', 'punchy horn stabs'],
    ambient:    ['crowd energy textures', 'dark tension pads', 'dramatic string swells'],
    ratio:      '45% organic / 55% synthetic',
  },
};

const INTENTION_MELODIC_OVERRIDE: Partial<Record<IntentionType, string>> = {
  uplift_spirit:   'gospel choir + organ',
  celebrate_truth: 'brass horns + live percussion',
  provoke_thought: 'jazz piano + double bass',
  process_pain:    'acoustic guitar + harmonica',
};

function pick<T>(arr: T[], hash: number): T {
  return arr[hash % arr.length];
}

export function computeInstrumentation(input: SonicWorldInput, hash: number): InstrumentationOutput {
  const base            = EMOTION_INSTRUMENTATION[input.emotion];
  const melodicOverride = INTENTION_MELODIC_OVERRIDE[input.intention];

  return {
    drum_style:             pick(base.drums,      hash),
    percussion_textures:    pick(base.percussion, hash ^ 0xAA),
    bass_character:         pick(base.bass,       hash ^ 0x55),
    melodic_instruments:    melodicOverride ?? pick(base.melodic, hash ^ 0xFF),
    ambient_layers:         pick(base.ambient,    hash ^ 0x33),
    organic_synthetic_ratio: base.ratio,
  };
}

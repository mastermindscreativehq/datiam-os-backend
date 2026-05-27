import type { EmotionType, TransformationType, SonicWorldInput } from '../sonic-world.types';

export interface HarmonicEmotionOutput {
  musical_key: string;
  scale: string;
  chord_behavior: string;
  emotional_progression: string;
  tension_release_behavior: string;
}

interface HarmonicBase {
  chordBehaviors:          string[];
  emotionalProgressions:   string[];
  tensionReleaseBehaviors: string[];
}

const EMOTION_HARMONIC_BASE: Record<EmotionType, HarmonicBase> = {
  grief: {
    chordBehaviors:          ['brooding i–VI–III–VII with unresolved suspension', 'slow minor cadences avoiding resolution', 'descending chromatic walk'],
    emotionalProgressions:   ['settles into sadness — refuses to lift', 'circling grief with no exit', 'heavy acceptance in the final chord'],
    tensionReleaseBehaviors: ['tension sustained throughout — release only in silence', 'unresolved cadence held into outro', 'resolution delayed until final bar'],
  },
  trauma: {
    chordBehaviors:          ['unstable diminished movement with wrong-note passing chords', 'tritone substitutions creating unease', 'chromatic half-step dissonance'],
    emotionalProgressions:   ['no stable tonal center — drifts through trauma', 'fragments of resolution that collapse', 'arrives somewhere unresolved'],
    tensionReleaseBehaviors: ['tension without catharsis — perpetual state of alarm', 'sudden releases that create more unease', 'dissonance as resting state'],
  },
  rage: {
    chordBehaviors:          ['driving power chord movement in harmonic minor', 'relentless i–VII–VI–VII pattern', 'aggressive leading tone resolution'],
    emotionalProgressions:   ['escalating tension with explosive peaks', 'builds to maximum harmonic density', 'forceful resolution on minor tonic'],
    tensionReleaseBehaviors: ['tension builds without ceiling — constant crescendo', 'explosive release then immediate rebuild', 'no true resolution — rage returns'],
  },
  joy: {
    chordBehaviors:          ['bright I–V–vi–IV with open voicings', 'major triads with added color tones', 'rising resolution to tonic'],
    emotionalProgressions:   ['effortless lift from verse to chorus', 'each chord feels like permission to smile', 'open and expansive harmonic arc'],
    tensionReleaseBehaviors: ['tension is playful — never threatening', 'immediate release that triggers joy response', 'resolution as celebration'],
  },
  melancholy: {
    chordBehaviors:          ['wandering i–IV–VII–III in dorian', 'minor chords with raised 6th ambiguity', 'gentle unresolved sus2 chords'],
    emotionalProgressions:   ['gentle pull between minor and relative major', 'bittersweet ambiguity — never fully sad nor happy', 'wandering without arriving'],
    tensionReleaseBehaviors: ['soft tension with gentle incomplete resolutions', "cadences that land but don't fully settle", 'bittersweet harmonic acceptance'],
  },
  euphoria: {
    chordBehaviors:          ['climbing lydian IV–I–V–II with lifted feel', 'bright major chords with suspended resolutions', 'ascending harmonic movement'],
    emotionalProgressions:   ['continuous lift with no ceiling', 'each chorus higher than the last', "transcendent peak that doesn't resolve downward"],
    tensionReleaseBehaviors: ['builds to ecstatic release — euphoric drop moment', 'tension is anticipation — release is transcendence', 'resolution as peak experience'],
  },
  anxiety: {
    chordBehaviors:          ['unresolved leading-tone tension in phrygian', 'tight voice leading with constant half-step tension', 'dominant-seventh chords that refuse to resolve'],
    emotionalProgressions:   ['perpetual unresolved state — no safe landing', 'tension accumulates without release', 'false resolution followed by new tension'],
    tensionReleaseBehaviors: ['zero release — sustained anxiety state', 'delayed resolution that never arrives', 'tension as the permanent emotional home'],
  },
  longing: {
    chordBehaviors:          ['suspended fourth with unresolved cadence in dorian', 'sus2 chords hanging mid-phrase', 'reaching toward resolution without touching it'],
    emotionalProgressions:   ['perpetual reaching toward something unreachable', 'bittersweet arrival that immediately departs', 'longing expressed through harmonic incompleteness'],
    tensionReleaseBehaviors: ['tension is wanting — release is a brief touch then loss', 'partial resolution that opens more longing', 'suspended resolution that never fully lands'],
  },
  triumph: {
    chordBehaviors:          ['bold I–IV–V–I with full orchestral voicing', 'major cadences with powerful resolution', 'climactic plagal cadence at peak'],
    emotionalProgressions:   ['builds from uncertainty to absolute conviction', 'each section confirms the victory more strongly', 'final tonic resolution as achievement'],
    tensionReleaseBehaviors: ['tension builds to earned and powerful release', 'release feels deserved after long journey', 'full resolution with no ambiguity'],
  },
  nostalgia: {
    chordBehaviors:          ['mixolydian I–VII–IV–I with vintage warmth', 'major chord with lowered seventh feel', 'classic circular progression with soul warmth'],
    emotionalProgressions:   ['warm familiar arc — like returning home', 'gentle bittersweet journey through memory', 'arrives at warm acceptance'],
    tensionReleaseBehaviors: ['soft nostalgia tension — the ache of distance', 'warm resolution that is also goodbye', 'bittersweet release through memory'],
  },
  peace: {
    chordBehaviors:          ['open major triads with gentle movement', 'no dissonance — pure consonance', 'simple I–IV–I movement with space'],
    emotionalProgressions:   ['stable and settled throughout', 'no dramatic arc — continuous serenity', 'arrives early and stays'],
    tensionReleaseBehaviors: ['no tension — pure resolution state', 'immediate resolution — nothing to release', 'stillness is the destination'],
  },
  defiance: {
    chordBehaviors:          ['minor driving to unexpected major resolution', 'powerful i–VII–VI–VII with brass reinforcement', 'harmonic minor with bold raised 7th resolution'],
    emotionalProgressions:   ['minor conviction building to unexpected major triumph', 'darkness confronted and overcome harmonically', 'resolution feels like victory'],
    tensionReleaseBehaviors: ['controlled tension serving the message', 'release as declaration — not escape', 'tension dissolved by conviction'],
  },
};

const TRANSFORMATION_HARMONIC_SHIFT: Record<TransformationType, string> = {
  from_pain_to_peace:          'harmonic arc moves from minor to major tonic by final chorus',
  from_stagnation_to_momentum: 'chords gain momentum and density as the track progresses',
  from_confusion_to_clarity:   'tonality becomes clearer with each section',
  from_isolation_to_belonging: 'sparse individual chords grow into full harmonic stack',
  from_fear_to_courage:        'tentative minor harmonics rise to confident major resolution',
  from_grief_to_acceptance:    'minor grief resolves to major acceptance in the final section',
  from_doubt_to_conviction:    'harmonic ambiguity resolves to unambiguous conviction',
  from_chaos_to_order:         'dissonant harmonic clusters resolve into structured progressions',
};

function pick<T>(arr: T[], hash: number): T {
  return arr[hash % arr.length];
}

export function computeHarmonicEmotion(input: SonicWorldInput, hash: number): HarmonicEmotionOutput {
  const base          = EMOTION_HARMONIC_BASE[input.emotion];
  const harmonicShift = TRANSFORMATION_HARMONIC_SHIFT[input.listener_transformation];
  const baseProgression = pick(base.emotionalProgressions, hash ^ 0x44);

  return {
    musical_key:              input.musical_key,
    scale:                    input.scale,
    chord_behavior:           pick(base.chordBehaviors, hash),
    emotional_progression:    `${baseProgression} — ${harmonicShift}`,
    tension_release_behavior: pick(base.tensionReleaseBehaviors, hash ^ 0x55),
  };
}

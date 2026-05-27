import type { EmotionType, IntentionType, TransformationType, SonicWorldInput } from '../sonic-world.types';

export interface HookStrategyOutput {
  hook_intensity: string;
  chant_potential: string;
  replayability: string;
  anthem_potential: string;
  crowd_engagement_energy: string;
}

interface HookBase {
  intensities:     string[];
  chantPotentials: string[];
  replayabilities: string[];
  anthemPotentials: string[];
  crowdEngagements: string[];
}

const EMOTION_HOOK_BASE: Record<EmotionType, HookBase> = {
  grief: {
    intensities:      ['quietly devastating', 'subdued but unforgettable', 'heartbreak held gently'],
    chantPotentials:  ['low — too personal for mass chant', 'intimate group hum potential', 'collective quiet shared'],
    replayabilities:  ['emotional attachment — relived for the feeling', 'cathartic replay — each time releases something', 'personal resonance — feels like your own experience'],
    anthemPotentials: ['grief anthem within mourning community', "private anthem — doesn't need a crowd", 'deeply niche but absolutely certain'],
    crowdEngagements: ['silent acknowledgment — hands on hearts', 'shared stillness together', 'quiet singing in the dark'],
  },
  trauma: {
    intensities:      ['fractured and haunting', 'disturbing and unforgettable', 'broken and real'],
    chantPotentials:  ['very low — too damaged for easy chanting', 'dark communal recognition', 'whispered collective'],
    replayabilities:  ["compulsive return — can't look away", 'repeat listens reveal new pain layers', 'uncomfortable familiarity'],
    anthemPotentials: ['trauma anthem for survivors', 'underground anthem — not for mainstream', 'specific and unavoidable'],
    crowdEngagements: ['recognition energy — seen and heard', 'underground community moment', 'silent knowing'],
  },
  rage: {
    intensities:      ['explosive and cathartic', 'aggressive and unavoidable', 'overwhelming force'],
    chantPotentials:  ['high — built for mass release', 'crowd chant ready', 'protest chant potential'],
    replayabilities:  ['emotional release — play when you need to explode', 'physical replay — activates body', 'cathartic return'],
    anthemPotentials: ['strong — anger unites crowds', 'protest anthem energy', 'rage anthem in its community'],
    crowdEngagements: ['mosh energy — full release', 'collective shouting', 'unified anger expression'],
  },
  joy: {
    intensities:      ['infectious and bright', 'unstoppable happiness', 'joyful explosion'],
    chantPotentials:  ['very high — everyone joins', 'natural singalong structure', 'call-and-response ready'],
    replayabilities:  ['mood elevation — play for a boost', 'social replay — play with others', 'celebration return'],
    anthemPotentials: ['mainstream anthem energy', 'party anthem ready', 'summer anthem potential'],
    crowdEngagements: ['dancing without asking permission', 'full crowd participation', 'synchronized joy'],
  },
  melancholy: {
    intensities:      ['achingly memorable', 'beautiful sadness', 'bittersweet perfection'],
    chantPotentials:  ['moderate — hum-along potential', 'soft group sing', 'quiet collective resonance'],
    replayabilities:  ['comfort replay — familiar and safe', 'late night return', 'bittersweet return for the feeling'],
    anthemPotentials: ['indie anthem energy', 'niche but beloved', 'private life anthem'],
    crowdEngagements: ['eyes-closed sing-along', 'intimate crowd connection', 'gentle collective sway'],
  },
  euphoria: {
    intensities:      ['overwhelming peak experience', 'transcendent and earth-moving', 'ecstatic release'],
    chantPotentials:  ["peak high — crowd can't resist", 'rave chant ready', 'hands-in-air moment'],
    replayabilities:  ['chasing the first high', 'drop replay — for the release', 'euphoric return'],
    anthemPotentials: ['festival anthem energy', 'club anthem', 'summer festival peak'],
    crowdEngagements: ['arms raised collective transcendence', 'peak floor moment', 'mass euphoric release'],
  },
  anxiety: {
    intensities:      ['urgent and unavoidable', 'relentless and tense', "grabs and won't let go"],
    chantPotentials:  ['low-moderate — tension prevents easy chanting', 'anxious repetition', 'nervous group energy'],
    replayabilities:  ['compulsive return — anxiety is familiar', 'replay to process the feeling', 'uncomfortable but necessary return'],
    anthemPotentials: ['anxiety anthem for those who understand', 'generation Z resonance', 'underground mental health anthem'],
    crowdEngagements: ['recognition energy — shared anxiety', 'tense collective moment', 'nervous energy transfer'],
  },
  longing: {
    intensities:      ['bittersweet and reaching', 'aching beauty', 'tender devastation'],
    chantPotentials:  ['moderate — yearning singalong', 'soft crowd hum', 'quiet shared longing'],
    replayabilities:  ['longing replay — for the ache', 'late-night return for distance feeling', 'return when missing someone'],
    anthemPotentials: ['love lost anthem', 'distance anthem', 'diaspora community resonance'],
    crowdEngagements: ['couples holding each other', 'slow dance crowd energy', 'reaching toward something together'],
  },
  triumph: {
    intensities:      ['anthemic declaration', 'earned and powerful', 'victory cry'],
    chantPotentials:  ['very high — built to be chanted', 'stadium singalong ready', 'call to action structure'],
    replayabilities:  ['motivation replay — play before battle', 'victory celebration return', 'achievement context replay'],
    anthemPotentials: ['strong anthem potential — universal resonance', 'sports anthem energy', 'graduation anthem energy'],
    crowdEngagements: ['fists raised together', 'unified declaration energy', 'collective achievement moment'],
  },
  nostalgia: {
    intensities:      ['familiar and resonant', 'warm recognition', 'classic feel'],
    chantPotentials:  ['high — everyone knows the words in spirit', 'golden era singalong', 'community memory chant'],
    replayabilities:  ['memory replay — for the era feeling', 'comfort return — always fits', 'shared memory activation'],
    anthemPotentials: ['community anthem for a generation', 'cultural touchstone', 'reunion energy'],
    crowdEngagements: ['everyone knows the words', 'generational shared moment', 'memory-activated community'],
  },
  peace: {
    intensities:      ['serene and resolving', 'still and certain', 'tranquil power'],
    chantPotentials:  ['low — peace resists chanting', 'meditative group hum', 'quiet collective breath'],
    replayabilities:  ['stress relief replay', 'meditation playlist return', 'return for calm'],
    anthemPotentials: ['wellness community anthem', 'spiritual practice anthem', 'soft but certain'],
    crowdEngagements: ['eyes-closed stillness', 'group breathing energy', 'collective peace exhale'],
  },
  defiance: {
    intensities:      ['unmistakable battle cry', 'powerful and unyielding', 'declaration of self'],
    chantPotentials:  ['high — defiance chants unite', 'protest structure ready', 'battle cry potential'],
    replayabilities:  ['empowerment replay', 'replay when facing opposition', 'return for strength'],
    anthemPotentials: ['strong — defiance unites people', 'cultural resistance anthem', 'movement anthem energy'],
    crowdEngagements: ['collective standing moment', 'march energy transfer', 'unified unyielding energy'],
  },
};

const INTENTION_HOOK_MODIFIER: Partial<Record<IntentionType, string>> = {
  inspire_action:   'designed to mobilize — not just feel',
  celebrate_truth:  'joyful proclamation hook structure',
  uplift_spirit:    'spiritual uplift potential',
  heal_listener:    'healing resolution hook',
  process_pain:     'cathartic pain-release hook',
  provoke_thought:  'lingering question hook that stays',
};

const TRANSFORMATION_ANTHEM_BOOST: Record<TransformationType, string> = {
  from_pain_to_peace:          'journey completed makes the hook an earned arrival',
  from_stagnation_to_momentum: 'momentum hook — releases the stuck energy',
  from_confusion_to_clarity:   'clarity hook — the moment it all makes sense',
  from_isolation_to_belonging: 'belonging hook — the crowd becomes one',
  from_fear_to_courage:        'courage hook — the moment fear transforms',
  from_grief_to_acceptance:    'acceptance hook — grief transformed into peace',
  from_doubt_to_conviction:    'conviction hook — certainty as the release',
  from_chaos_to_order:         'order hook — the moment chaos resolves',
};

function pick<T>(arr: T[], hash: number): T {
  return arr[hash % arr.length];
}

export function computeHookStrategy(input: SonicWorldInput, hash: number): HookStrategyOutput {
  const base           = EMOTION_HOOK_BASE[input.emotion];
  const intentionMod   = INTENTION_HOOK_MODIFIER[input.intention];
  const anthemBoost    = TRANSFORMATION_ANTHEM_BOOST[input.listener_transformation];
  const baseIntensity  = pick(base.intensities, hash);

  return {
    hook_intensity:          intentionMod ? `${baseIntensity} — ${intentionMod}` : baseIntensity,
    chant_potential:         pick(base.chantPotentials,  hash ^ 0x11),
    replayability:           pick(base.replayabilities,  hash ^ 0x22),
    anthem_potential:        `${pick(base.anthemPotentials, hash ^ 0x33)} — ${anthemBoost}`,
    crowd_engagement_energy: pick(base.crowdEngagements, hash ^ 0x44),
  };
}

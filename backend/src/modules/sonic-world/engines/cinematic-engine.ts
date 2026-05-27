import type { EmotionType, TransformationType, SonicWorldInput } from '../sonic-world.types';

export interface CinematicEnvironmentOutput {
  visual_sonic_atmosphere: string;
  emotional_weather: string;
  scene_energy: string;
  cinematic_references: string;
}

interface CinematicBase {
  visualAtmospheres: string[];
  emotionalWeathers: string[];
  scenes:            string[];
  cinematicRefs:     string[];
}

const EMOTION_CINEMATIC_BASE: Record<EmotionType, CinematicBase> = {
  grief: {
    visualAtmospheres: ['empty apartment at 3am — scattered photographs', 'rain-soaked window with streetlight blur', 'grey morning after the funeral'],
    emotionalWeathers: ['permanent overcast that never rains', 'the silence after a storm passes', 'winter dusk settling into night'],
    scenes:            ['solitary figure in an empty house', 'standing at a grave in the rain', 'sitting in a parked car unable to move'],
    cinematicRefs:     ['Moonlight (final act)', 'Manchester by the Sea', 'Eternal Sunshine of the Spotless Mind'],
  },
  trauma: {
    visualAtmospheres: ["fragmented memory — images that don't connect", 'flickering lights in an abandoned space', 'disorienting slow-motion reality'],
    emotionalWeathers: ['storm inside a glass box — chaos contained', 'static in the air before lightning', 'fever dream clarity'],
    scenes:            ['disjointed flashback sequence', 'frozen in a moment that keeps repeating', 'running from something unnamed'],
    cinematicRefs:     ['Requiem for a Dream', 'Black Swan', 'Hereditary opening sequence'],
  },
  rage: {
    visualAtmospheres: ['city streets at night — everything on fire', 'red light district at 2am', 'industrial wasteland under pressure'],
    emotionalWeathers: ['volatile electrical storm — about to break', 'heat lightning with no rain', 'pressure that has no release'],
    scenes:            ['confrontation in a dark alley', 'breaking everything in sight', 'marching through a street in protest'],
    cinematicRefs:     ['Nightcrawler', 'The Wire', 'Uncut Gems climax'],
  },
  joy: {
    visualAtmospheres: ['golden-hour rooftop party', 'beach at sunset with crowd', 'city lights from above at peak night'],
    emotionalWeathers: ['perfect summer day with warm breeze', 'golden magic hour', 'first warm day after a long winter'],
    scenes:            ['people dancing without restraint', 'spontaneous celebration in the street', 'friends reuniting after years apart'],
    cinematicRefs:     ['Moonrise Kingdom', 'La La Land opening number', 'Everything Everywhere All at Once joy sequence'],
  },
  melancholy: {
    visualAtmospheres: ['dimly lit apartment on a rainy evening', 'train at night through empty countryside', 'dusty record store in winter'],
    emotionalWeathers: ['overcast but not raining — perpetual grey', 'last warmth of autumn', 'fading afternoon light'],
    scenes:            ['alone in a coffee shop watching strangers', 'slow drive through familiar streets at dusk', 'old voicemail listened to late at night'],
    cinematicRefs:     ['Lost in Translation', 'Her', 'Paterson (Jim Jarmusch)'],
  },
  euphoria: {
    visualAtmospheres: ['rave at peak hour — lights fractured', 'aerial shot of city at night', 'festival crowd at the drop'],
    emotionalWeathers: ['electric sky before the storm breaks', 'aurora borealis explosion', 'sunrise after an all-night journey'],
    scenes:            ['arms raised in a transcendent crowd moment', 'first drop hitting the dance floor', 'falling in love in fast-motion'],
    cinematicRefs:     ['Midsommar maypole sequence', 'Climax (Gaspar Noé)', 'Spring Breakers neon sequence'],
  },
  anxiety: {
    visualAtmospheres: ['crowded subway at rush hour — trapped', 'fluorescent office building late at night', 'traffic jam with no visible end'],
    emotionalWeathers: ['humid pressure before a storm that never comes', 'ticking clock in a locked room', 'vibration in the walls'],
    scenes:            ['pacing in a small room', 'phone buzzing continuously unanswered', 'meeting where something is about to go wrong'],
    cinematicRefs:     ['Uncut Gems', 'Black Mirror: Nosedive', 'A Quiet Place'],
  },
  longing: {
    visualAtmospheres: ['airport departure gate at night', 'watching someone walk away down a long street', 'empty chair at a full table'],
    emotionalWeathers: ['autumn twilight — golden but fading', 'wind that carries a familiar scent', 'last light before dark'],
    scenes:            ['staring at an old photograph', 'watching a city from a train window', 'standing outside a house from your past'],
    cinematicRefs:     ['Call Me By Your Name', 'In the Mood for Love', 'Blue Valentine'],
  },
  triumph: {
    visualAtmospheres: ['summit of the mountain at sunrise', 'stadium with 80,000 people standing', 'courtroom doors bursting open'],
    emotionalWeathers: ['sunrise after the darkest night', 'first breath of fresh air after confinement', 'the moment clouds part and sunlight breaks through'],
    scenes:            ['triumphant walk through a crowd parting', 'looking back at how far you\'ve come', 'crossing the finish line exhausted and proud'],
    cinematicRefs:     ['Rocky training montage', 'The Pursuit of Happyness ending', 'Creed — final fight'],
  },
  nostalgia: {
    visualAtmospheres: ['summer backyard barbecue from childhood', 'old VHS footage — grain and warmth', 'hometown at sunset — nothing has changed'],
    emotionalWeathers: ['warm September evening — fading summer', 'the smell of a familiar place', 'golden-sepia light that only exists in memory'],
    scenes:            ['flipping through a physical photo album', 'driving past your old house', 'the first song you ever loved playing on the radio'],
    cinematicRefs:     ['Boyhood', 'Stand by Me', 'The Perks of Being a Wallflower'],
  },
  peace: {
    visualAtmospheres: ['monastery garden at dawn', 'empty beach after storm clears', 'mountain lake at sunrise — glass still'],
    emotionalWeathers: ['the silence after the storm fully passes', 'warm sun after days of rain', 'first spring morning — everything returned'],
    scenes:            ['sitting in nature with no destination', 'meditation on a rooftop above the city', 'a long embrace after a long separation'],
    cinematicRefs:     ['Terrence Malick — The Tree of Life', '2001: A Space Odyssey transcendence', 'Spring Summer Fall Winter'],
  },
  defiance: {
    visualAtmospheres: ['frontline of a march — banners raised', 'lone figure standing against a crowd', 'underground cipher in a parking garage'],
    emotionalWeathers: ['steel sky before a battle', 'electric charge of collective purpose', 'calm before the confrontation'],
    scenes:            ['refusing to sit down when told to', 'underground organizing in a back room', 'speech to a crowd who wasn\'t supposed to listen'],
    cinematicRefs:     ['Do the Right Thing', 'Selma', 'BlacKkKlansman final sequence'],
  },
};

const TRANSFORMATION_SCENE_SHIFT: Record<TransformationType, string> = {
  from_pain_to_peace:          'scene transforms from dark interior to open landscape',
  from_stagnation_to_momentum: 'static shot becomes tracking shot — speed building',
  from_confusion_to_clarity:   'blurred focus sharpens to perfect clarity',
  from_isolation_to_belonging: 'lone figure is gradually joined by others',
  from_fear_to_courage:        'crouching figure rises slowly to standing',
  from_grief_to_acceptance:    'rain sequence ending in still quiet light',
  from_doubt_to_conviction:    'hesitant first step becomes a determined stride',
  from_chaos_to_order:         'chaotic handheld camera settles into locked-off composition',
};

function pick<T>(arr: T[], hash: number): T {
  return arr[hash % arr.length];
}

export function computeCinematicEnvironment(input: SonicWorldInput, hash: number): CinematicEnvironmentOutput {
  const base       = EMOTION_CINEMATIC_BASE[input.emotion];
  const sceneShift = TRANSFORMATION_SCENE_SHIFT[input.listener_transformation];
  const baseScene  = pick(base.scenes, hash ^ 0x77);

  return {
    visual_sonic_atmosphere: pick(base.visualAtmospheres, hash),
    emotional_weather:       pick(base.emotionalWeathers, hash ^ 0x44),
    scene_energy:            `${baseScene} — ${sceneShift}`,
    cinematic_references:    pick(base.cinematicRefs, hash ^ 0x88),
  };
}

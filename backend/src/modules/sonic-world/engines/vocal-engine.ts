import type { EmotionType, IntentionType, SonicWorldInput } from '../sonic-world.types';

export interface VocalArchitectureOutput {
  vocal_texture: string;
  cadence_energy: string;
  harmony_behavior: string;
  emotional_intensity: string;
  vocal_atmosphere: string;
}

interface VocalBase {
  textures:          string[];
  cadenceEnergies:   string[];
  harmonyBehaviors:  string[];
  intensities:       string[];
  atmospheres:       string[];
}

const EMOTION_VOCAL_BASE: Record<EmotionType, VocalBase> = {
  grief: {
    textures:         ['breathy and close-miked', 'raw and unprocessed', 'whispered with reverb tail'],
    cadenceEnergies:  ['slow deliberate phrasing with long pauses', 'half-time delivery with breath between lines', 'glacial pacing that honors silence'],
    harmonyBehaviors: ['minimal harmonies — mostly solo voice', 'sparse one-note harmony in final phrase', 'wordless hum beneath the lead'],
    intensities:      ['controlled vulnerability breaking open in the bridge', 'quiet devastation building to cathartic release', 'suppressed emotion surfacing slowly'],
    atmospheres:      ['intimate confessional — just voice and space', 'solitary and exposed', 'funerary and sacred'],
  },
  trauma: {
    textures:         ['fractured and split', 'distorted and processed', 'fragmented with digital artifacts'],
    cadenceEnergies:  ['erratic phrasing with irregular breath', 'chopped and rearranged delivery', 'stuttered repetition with sudden stops'],
    harmonyBehaviors: ['dissonant doubled vocal', 'pitch-shifted shadow harmony', 'vocal chops without resolution'],
    intensities:      ['unpredictable — quiet then suddenly explosive', 'suppressed until breakdown', 'distorted emotional peak'],
    atmospheres:      ['fractured and haunted', 'dissociative and dreamlike', 'traumatic memory loop'],
  },
  rage: {
    textures:         ['raw and forceful with edge', 'aggressive with breath distortion', 'powerful with controlled rage'],
    cadenceEnergies:  ['rapid-fire delivery with hard stops', 'punishing cadence with breath as weapon', 'aggressive phrasing over hard beats'],
    harmonyBehaviors: ['none — solo raw power', 'gang vocal chanting', 'echoed declaration'],
    intensities:      ['relentless peak — no quiet moment', 'building rage with explosive chorus', 'controlled fury held tight'],
    atmospheres:      ['war declaration', 'confrontational and direct', 'volatile and dangerous'],
  },
  joy: {
    textures:         ['bright and airy with warmth', 'full and playful', 'crisp and celebratory'],
    cadenceEnergies:  ['light bouncing delivery', 'syncopated and danceable phrasing', 'free-flowing and natural rhythm'],
    harmonyBehaviors: ['layered harmonies in the chorus', 'call-and-response structure', 'background vocal stack'],
    intensities:      ['consistently joyful with no dark corner', 'growing joy from verse to chorus explosion', 'infectious happiness'],
    atmospheres:      ['celebration and freedom', 'sunny and open-hearted', 'communal joy'],
  },
  melancholy: {
    textures:         ['soft and introspective', 'gentle with slight breathiness', 'mellow and reflective'],
    cadenceEnergies:  ['flowing conversational delivery', 'gentle phrasing that breathes naturally', 'understated and thoughtful'],
    harmonyBehaviors: ['subtle third-harmony in chorus', 'warm background hum', 'occasional unison double'],
    intensities:      ['quiet and persistent sadness', 'bittersweet peaks that never fully open', 'controlled melancholy'],
    atmospheres:      ['late-night journal entry', 'thoughtful and interior', 'wistful and reflective'],
  },
  euphoria: {
    textures:         ['soaring and full-bodied', 'bright and processed with shimmer', 'powerful and effervescent'],
    cadenceEnergies:  ['breathless and rushing forward', 'soaring over the drop', 'explosive release in the chorus'],
    harmonyBehaviors: ['massive harmony stack at the peak', 'lush choir-like layers', 'vocal chop build into chorus'],
    intensities:      ['overwhelming peak — maximum emotional output', 'euphoric crescendo', 'transcendent high point'],
    atmospheres:      ['ecstatic and limitless', 'peak-moment transcendence', 'collective uplift'],
  },
  anxiety: {
    textures:         ['tense and urgent', 'breathless and clipped', 'close-miked with nervous energy'],
    cadenceEnergies:  ['rapid phrasing with no rest', 'tight and breathless delivery', 'urgent forward motion'],
    harmonyBehaviors: ['dissonant shadow vocal', 'nervous unison double', 'tense background wash'],
    intensities:      ['constant moderate anxiety with no release', 'building tension with no catharsis', 'relentless urgency'],
    atmospheres:      ['relentless internal monologue', 'trapped and restless', 'spiraling unease'],
  },
  longing: {
    textures:         ['searching and tender', 'warm with ache in the tone', 'breathy with sustained notes'],
    cadenceEnergies:  ['slow reaching phrases', 'suspended delivery with held notes', 'gentle and yearning phrasing'],
    harmonyBehaviors: ["soft third harmony that doesn't fully resolve", 'distant background vocal echo', 'warm harmonic haze'],
    intensities:      ['aching want beneath controlled delivery', 'suppressed longing that surfaces in the hook', 'gentle yearning throughout'],
    atmospheres:      ['reaching across distance', 'tender and open-hearted', 'nostalgic for something out of reach'],
  },
  triumph: {
    textures:         ['powerful and declarative', 'full projection with authority', 'clear and commanding'],
    cadenceEnergies:  ['steady and building delivery', 'powerful phrasing with intentional pauses', 'building cadence to anthemic peak'],
    harmonyBehaviors: ['full choir stack in the chorus', 'call-and-response with crowd', 'anthemic unison delivery'],
    intensities:      ['building certainty from verse to triumphant chorus', 'powerful peak with full voice', 'unstoppable conviction'],
    atmospheres:      ['victory proclamation', 'earned confidence', 'monument to resilience'],
  },
  nostalgia: {
    textures:         ['warm and nostalgic with character', 'slightly dusty and vintage', 'full with old-soul quality'],
    cadenceEnergies:  ['rolling and reminiscent', 'conversational storytelling pace', 'leisurely phrasing that breathes'],
    harmonyBehaviors: ['warm soul-style background harmonies', 'classic doo-wop inspired stack', 'echo harmony in the pocket'],
    intensities:      ['warm glow of memory', 'bittersweet peak at the bridge', 'comfortable emotional depth'],
    atmospheres:      ['time-travel to a beloved moment', 'golden memory warmth', 'storytelling around a fire'],
  },
  peace: {
    textures:         ['gentle and centered', 'soft with natural warmth', 'unhurried and present'],
    cadenceEnergies:  ['unhurried and grounded delivery', 'spacious phrasing with room to breathe', 'meditative and deliberate'],
    harmonyBehaviors: ['soft complementary harmony', 'angelic light harmony layer', 'ambient vocal hum'],
    intensities:      ['consistent serenity with no tension', 'quiet joy in stillness', 'deep peaceful certainty'],
    atmospheres:      ['sanctuary and stillness', 'arrival after a long journey', 'spiritual centeredness'],
  },
  defiance: {
    textures:         ['grounded and unapologetic', 'powerful with controlled edge', 'clear and forceful'],
    cadenceEnergies:  ['forceful and unwavering delivery', 'rhythmic repetition for impact', 'punching each word with conviction'],
    harmonyBehaviors: ['gang vocal on key phrases', 'echo of the hook for emphasis', 'crowd-style chant potential'],
    intensities:      ['steady unbreakable conviction', 'building to a declaration', 'controlled power peak'],
    atmospheres:      ['frontline soldier', 'unmoved by opposition', 'battle-tested strength'],
  },
};

const INTENTION_ATMOSPHERE_MODIFIER: Partial<Record<IntentionType, string>> = {
  heal_listener:    'healing space',
  inspire_action:   'rally point',
  create_nostalgia: 'nostalgic warmth',
  uplift_spirit:    'spiritual elevation',
  celebrate_truth:  'jubilant declaration',
  process_pain:     'cathartic confessional',
};

function pick<T>(arr: T[], hash: number): T {
  return arr[hash % arr.length];
}

export function computeVocalArchitecture(input: SonicWorldInput, hash: number): VocalArchitectureOutput {
  const base               = EMOTION_VOCAL_BASE[input.emotion];
  const atmosphereModifier = INTENTION_ATMOSPHERE_MODIFIER[input.intention];
  const baseAtmosphere     = pick(base.atmospheres, hash);

  return {
    vocal_texture:       pick(base.textures,         hash),
    cadence_energy:      pick(base.cadenceEnergies,  hash ^ 0x11),
    harmony_behavior:    pick(base.harmonyBehaviors,  hash ^ 0x22),
    emotional_intensity: pick(base.intensities,       hash ^ 0x33),
    vocal_atmosphere:    atmosphereModifier
                           ? `${baseAtmosphere} — with ${atmosphereModifier}`
                           : baseAtmosphere,
  };
}

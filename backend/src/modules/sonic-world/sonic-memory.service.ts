import { eq, desc } from 'drizzle-orm';
import { db } from '../../db';
import { sonic_memory, sonic_world_blueprints } from '../../db/schema';
import type { SonicWorldBlueprint } from '../../db/schema';

const EMOTIONS = ['grief','trauma','rage','joy','melancholy','euphoria','anxiety','longing','triumph','nostalgia','peace','defiance'];
const INTENTIONS = ['heal_listener','inspire_action','create_nostalgia','deliver_message','uplift_spirit','provoke_thought','celebrate_truth','process_pain'];
const SCALES = ['Major','Minor','Dorian','Phrygian','Lydian','Mixolydian','Locrian','Pentatonic','Blues','Chromatic'];

function computeRankingScores(bp: SonicWorldBlueprint) {
  const coherence = Number(bp.coherence_score);
  const emotional_intensity_score  = parseFloat((bp.emotional_rawness / 100).toFixed(2));
  const commercial_potential_score = parseFloat((bp.commercial_accessibility / 100).toFixed(2));
  const spiritual_alignment_score  = parseFloat((bp.spiritual_intensity / 100).toFixed(2));
  const replayability_score        = parseFloat(
    Math.min(1, (0.4 * bp.commercial_accessibility + 0.3 * bp.emotional_rawness + 0.3 * coherence * 100) / 100).toFixed(2),
  );
  return { emotional_intensity_score, commercial_potential_score, spiritual_alignment_score, replayability_score };
}

function buildMemoryVector(bp: SonicWorldBlueprint, emotion: string, intention: string) {
  const n = (v: number, min: number, range: number) => parseFloat(((v - min) / range).toFixed(4));
  return {
    version: 'mv-1',
    dims: [
      n(bp.bpm, 40, 260),
      n(bp.cinematic_density, 0, 100),
      n(bp.spiritual_intensity, 0, 100),
      n(bp.emotional_rawness, 0, 100),
      n(bp.commercial_accessibility, 0, 100),
      n(bp.darkness_vs_hope, 0, 100),
      n(bp.underground_vs_mainstream, 0, 100),
      n(bp.organic_vs_synthetic, 0, 100),
      Number(bp.coherence_score),
      Number(bp.confidence_score),
      EMOTIONS.indexOf(emotion)   / Math.max(EMOTIONS.length - 1, 1),
      INTENTIONS.indexOf(intention) / Math.max(INTENTIONS.length - 1, 1),
      bp.scale === 'Major' ? 1 : 0,
      SCALES.indexOf(bp.scale) / Math.max(SCALES.length - 1, 1),
    ],
    labels: ['bpm','cinematic','spiritual','emotional','commercial','darkness','underground','organic','coherence','confidence','emotion','intention','scale_major','scale_idx'],
  };
}

export async function ingestBlueprintMemory(
  blueprint: SonicWorldBlueprint,
  emotion: string,
  intention: string,
): Promise<void> {
  const scores = computeRankingScores(blueprint);
  const memory_vector = buildMemoryVector(blueprint, emotion, intention);

  await db
    .insert(sonic_memory)
    .values({
      blueprint_id:               blueprint.id,
      artist_id:                  blueprint.artist_id,
      emotion_at_generation:      emotion,
      intention_at_generation:    intention,
      bpm:                        blueprint.bpm,
      musical_key:                blueprint.musical_key,
      scale:                      blueprint.scale,
      primary_genre:              blueprint.primary_genre,
      secondary_genre:            blueprint.secondary_genre,
      cinematic_density:          blueprint.cinematic_density,
      spiritual_intensity:        blueprint.spiritual_intensity,
      emotional_rawness:          blueprint.emotional_rawness,
      commercial_accessibility:   blueprint.commercial_accessibility,
      darkness_vs_hope:           blueprint.darkness_vs_hope,
      underground_vs_mainstream:  blueprint.underground_vs_mainstream,
      organic_vs_synthetic:       blueprint.organic_vs_synthetic,
      coherence_score:            String(blueprint.coherence_score),
      confidence_score:           String(blueprint.confidence_score),
      generation_quality:         blueprint.generation_quality,
      emotional_intensity_score:  String(scores.emotional_intensity_score),
      commercial_potential_score: String(scores.commercial_potential_score),
      spiritual_alignment_score:  String(scores.spiritual_alignment_score),
      replayability_score:        String(scores.replayability_score),
      memory_vector:              memory_vector as unknown as Record<string, unknown>,
      rl_weight:                  '1.00',
    })
    .onConflictDoNothing();
}

export async function getArtistMemories(artistId: string, limit = 500) {
  return db
    .select()
    .from(sonic_memory)
    .where(eq(sonic_memory.artist_id, artistId))
    .orderBy(desc(sonic_memory.ingested_at))
    .limit(limit);
}

export async function getArtistMemoriesChronological(artistId: string, limit = 500) {
  return db
    .select({
      mem: sonic_memory,
      bp_genre:      sonic_world_blueprints.primary_genre,
      bp_brief:      sonic_world_blueprints.producer_brief,
    })
    .from(sonic_memory)
    .innerJoin(sonic_world_blueprints, eq(sonic_memory.blueprint_id, sonic_world_blueprints.id))
    .where(eq(sonic_memory.artist_id, artistId))
    .orderBy(sonic_memory.ingested_at)
    .limit(limit);
}

export async function getBlueprintMemory(blueprintId: string) {
  const [mem] = await db
    .select()
    .from(sonic_memory)
    .where(eq(sonic_memory.blueprint_id, blueprintId))
    .limit(1);
  return mem ?? null;
}

export async function updateRlWeight(blueprintId: string, weight: number): Promise<void> {
  await db
    .update(sonic_memory)
    .set({ rl_weight: String(Math.min(2, Math.max(0, weight)).toFixed(2)) })
    .where(eq(sonic_memory.blueprint_id, blueprintId));
}

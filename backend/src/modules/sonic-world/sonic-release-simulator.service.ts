import { eq, desc } from 'drizzle-orm';
import { db } from '../../db';
import { sonic_world_blueprints, sonic_release_simulations, sonic_memory } from '../../db/schema';
import type { SonicWorldBlueprint } from '../../db/schema';

interface Archetype {
  name: string;
  style_tags: string[];
  genre_affinities: string[];
  bpm_range: [number, number];
  atmosphere_keywords: string[];
  commercial_min: number;
  darkness_min?: number;
  cinematic_min?: number;
}

const PRODUCER_ARCHETYPES: Archetype[] = [
  { name: 'Metro Boomin Style',      style_tags: ['dark','cinematic','hard','trap'],         genre_affinities: ['Trap','Dark Trap','Drill','Dark Soul'],          bpm_range: [130, 165], atmosphere_keywords: ['dark','cold','cinematic','menacing'],      commercial_min: 55, darkness_min: 55 },
  { name: 'Pharrell Williams Style', style_tags: ['sunny','vibrant','pop','playful'],        genre_affinities: ['Pop','Neo-Soul','Hip-Hop','Afrobeats'],           bpm_range: [90, 128],  atmosphere_keywords: ['vibrant','warm','playful','bright'],         commercial_min: 70 },
  { name: 'Arca Style',              style_tags: ['avant-garde','experimental','cinematic'], genre_affinities: ['Electronic','Experimental','Avant-Garde'],        bpm_range: [60, 140],  atmosphere_keywords: ['abstract','alien','dark','cinematic'],       commercial_min: 30, cinematic_min: 70 },
  { name: 'Mike Will Made-It Style', style_tags: ['trap','bass','aggressive','mainstream'],  genre_affinities: ['Trap','Hip-Hop','Pop Rap'],                       bpm_range: [125, 155], atmosphere_keywords: ['bass-heavy','aggressive','hard'],            commercial_min: 65 },
  { name: 'Frank Dukes Style',       style_tags: ['soulful','mellow','introspective'],       genre_affinities: ['R&B','Soul','Hip-Hop','Bedroom R&B'],             bpm_range: [75, 110],  atmosphere_keywords: ['warm','intimate','soul','mellow'],           commercial_min: 50 },
  { name: 'Jack Antonoff Style',     style_tags: ['indie','pop','emotional','cinematic'],    genre_affinities: ['Indie Pop','Pop','Alternative'],                  bpm_range: [80, 130],  atmosphere_keywords: ['emotional','cinematic','spacious','warm'],   commercial_min: 65, cinematic_min: 55 },
  { name: 'Flying Lotus Style',      style_tags: ['cosmic','jazz','experimental','trippy'],  genre_affinities: ['Neo-Soul','Jazz','Electronic','Afrofuturist'],    bpm_range: [70, 120],  atmosphere_keywords: ['cosmic','abstract','jazz','experimental'],   commercial_min: 30, cinematic_min: 60 },
  { name: 'Murda Beatz Style',       style_tags: ['melodic trap','mainstream','energetic'],  genre_affinities: ['Melodic Trap','Hip-Hop','Pop Rap','Celebration'], bpm_range: [120, 150], atmosphere_keywords: ['melodic','energetic','mainstream','vibrant'], commercial_min: 70 },
];

function scoreArchetype(bp: SonicWorldBlueprint, a: Archetype): number {
  let score = 0;
  const primaryLower    = bp.primary_genre.toLowerCase();
  const secondaryLower  = (bp.secondary_genre ?? '').toLowerCase();
  const atmoLower       = bp.visual_sonic_atmosphere.toLowerCase();

  // Genre affinity (40 pts)
  const genreHit = a.genre_affinities.some(g => primaryLower.includes(g.toLowerCase()) || secondaryLower.includes(g.toLowerCase()));
  if (genreHit) score += 40;
  else {
    const partial = a.genre_affinities.some(g => primaryLower.split(' ').some(w => g.toLowerCase().includes(w)));
    if (partial) score += 20;
  }

  // BPM range (25 pts)
  if (bp.bpm >= a.bpm_range[0] && bp.bpm <= a.bpm_range[1]) score += 25;
  else {
    const dist = Math.min(Math.abs(bp.bpm - a.bpm_range[0]), Math.abs(bp.bpm - a.bpm_range[1]));
    if (dist < 15) score += 15; else if (dist < 30) score += 8;
  }

  // Atmosphere (20 pts)
  const atmoHits = a.atmosphere_keywords.filter(kw => atmoLower.includes(kw)).length;
  score += Math.min(20, atmoHits * 5);

  // Commercial proximity (10 pts)
  if (bp.commercial_accessibility >= a.commercial_min) score += 10;
  else if (bp.commercial_accessibility >= a.commercial_min - 15) score += 5;

  // Bonuses (5 pts each)
  if (a.darkness_min  !== undefined && bp.darkness_vs_hope >= a.darkness_min)    score += 5;
  if (a.cinematic_min !== undefined && bp.cinematic_density >= a.cinematic_min)  score += 5;

  return Math.min(100, score);
}

function buildSyncTags(
  bp: SonicWorldBlueprint,
  commercial: number, sync: number, crowd: number, emotional: number, cinematic: number,
): string[] {
  const tags: string[] = [];
  const genre = bp.primary_genre.toLowerCase();

  if (genre.includes('trap') || genre.includes('hip-hop')) {
    if (commercial > 70) tags.push('Sports Highlight Sync');
    if (bp.darkness_vs_hope > 60) tags.push('Crime Drama Sync');
    tags.push('Urban Lifestyle Sync');
  }
  if (genre.includes('r&b') || genre.includes('soul')) {
    tags.push('Romance Drama Sync');
    if (emotional > 70) tags.push('Character Study Sync');
  }
  if (genre.includes('electronic') || genre.includes('dance')) {
    tags.push('Commercial / Ad Sync');
    if (crowd > 70) tags.push('Festival / Event Sync');
  }
  if (genre.includes('soul') || genre.includes('spiritual') || bp.spiritual_intensity > 70) {
    tags.push('Inspirational Sync');
  }
  if (bp.bpm < 80)                      { tags.push('Cinematic Score Sync'); tags.push('Slow Motion Sequence'); }
  else if (bp.bpm < 110)                { tags.push('Drama Scene Sync'); tags.push('Montage Sync'); }
  else if (bp.bpm < 130)                { tags.push('Action Sequence Sync'); tags.push('Training Montage Sync'); }
  else                                  { tags.push('Chase Scene Sync'); tags.push('High Energy Sync'); }

  if (emotional > 70)                   { tags.push('Emotional Journey Sync'); tags.push('Character Arc Sync'); }
  if (cinematic > 70)                   { tags.push('Film Score Ready'); if (cinematic > 75) tags.push('Netflix / Streaming Sync'); }
  if (commercial > 75)                  { tags.push('Brand / Commercial Sync'); tags.push('TikTok / Social Viral'); }
  if (bp.darkness_vs_hope > 70)        tags.push('Thriller / Horror Sync');
  else if (bp.darkness_vs_hope < 40)   { tags.push('Uplifting / Feel-Good Sync'); tags.push('Family Film Sync'); }
  if (commercial > 75 && bp.bpm >= 100 && bp.bpm <= 130) tags.push('Radio-Ready Sync');

  return [...new Set(tags)].slice(0, 8);
}

export async function simulateRelease(blueprintId: string, artistId: string) {
  const [bp] = await db.select().from(sonic_world_blueprints).where(eq(sonic_world_blueprints.id, blueprintId)).limit(1);
  if (!bp) throw new Error('Blueprint not found');

  const [mem] = await db.select().from(sonic_memory).where(eq(sonic_memory.blueprint_id, blueprintId)).limit(1);

  const coherence  = Number(bp.coherence_score);
  const confidence = Number(bp.confidence_score);

  // ── Six simulation scores ─────────────────────────────────────────────────

  const commercial_score = parseFloat(Math.min(100, (
    bp.commercial_accessibility * 0.45 +
    (100 - bp.underground_vs_mainstream) * 0.25 +
    coherence * 100 * 0.20 +
    Math.max(0, 10 - Math.abs(bp.bpm - 114) / 5)
  )).toFixed(2));

  const sync_score = parseFloat(Math.min(100, (
    bp.cinematic_density       * 0.40 +
    (100 - bp.darkness_vs_hope) * 0.20 +
    bp.commercial_accessibility * 0.20 +
    bp.emotional_rawness        * 0.15 +
    coherence * 100             * 0.05
  )).toFixed(2));

  const crowd_energy = parseFloat(Math.min(100, (
    bp.commercial_accessibility      * 0.30 +
    (100 - bp.spiritual_intensity)   * 0.20 +
    bp.emotional_rawness             * 0.25 +
    (100 - bp.underground_vs_mainstream) * 0.25
  )).toFixed(2));

  const replayability_prediction = parseFloat(Math.min(100, (
    bp.commercial_accessibility * 0.40 +
    bp.emotional_rawness        * 0.30 +
    coherence * 100             * 0.30
  )).toFixed(2));

  const emotional_stickiness = parseFloat(Math.min(100, (
    bp.emotional_rawness    * 0.45 +
    bp.spiritual_intensity  * 0.30 +
    coherence * 100         * 0.25
  )).toFixed(2));

  const cinematic_potential = parseFloat(Math.min(100, (
    bp.cinematic_density                  * 0.50 +
    bp.emotional_rawness                  * 0.20 +
    bp.spiritual_intensity                * 0.15 +
    (100 - bp.commercial_accessibility)   * 0.10 +
    coherence * 100                       * 0.05
  )).toFixed(2));

  const overall_release_score = parseFloat((
    commercial_score         * 0.25 +
    sync_score               * 0.15 +
    crowd_energy             * 0.20 +
    replayability_prediction * 0.20 +
    emotional_stickiness     * 0.10 +
    cinematic_potential      * 0.10
  ).toFixed(2));

  const sync_tags = buildSyncTags(bp, commercial_score, sync_score, crowd_energy, emotional_stickiness, cinematic_potential);

  const producer_compatibility = PRODUCER_ARCHETYPES
    .map(a => ({ ...a, compatibility_score: scoreArchetype(bp, a) }))
    .sort((a, b) => b.compatibility_score - a.compatibility_score)
    .slice(0, 4)
    .map(p => ({
      name:                p.name,
      style_tags:          p.style_tags,
      compatibility_score: p.compatibility_score,
      match_reason:        p.compatibility_score > 70
        ? 'Strong match — genre, BPM, and atmosphere align closely'
        : p.compatibility_score > 45 ? 'Moderate match — significant overlap in key areas'
        : 'Creative contrast — push your boundaries with this producer',
    }));

  const notes: string[] = [];
  if (commercial_score > 75)           notes.push('High commercial potential — radio and streaming ready.');
  if (sync_score > 70)                 notes.push('Strong sync placement potential — pitch to music supervisors.');
  if (crowd_energy > 75)               notes.push('Excellent live performance energy — crowd-ready.');
  if (emotional_stickiness > 75)       notes.push('Deep emotional resonance — high listener retention.');
  if (cinematic_potential > 75)        notes.push('Cinematic quality — suitable for film/TV scoring.');
  if (replayability_prediction > 75)   notes.push('High replayability — strong streaming metrics potential.');
  if (notes.length === 0)              notes.push('Solid foundation — targeted development recommended.');

  const sim_confidence = parseFloat(Math.min(0.95, 0.50 + confidence * 0.20 + coherence * 0.20 + (mem ? 0.10 : 0)).toFixed(2));

  const simData = {
    commercial_score:          String(commercial_score),
    sync_score:                String(sync_score),
    crowd_energy:              String(crowd_energy),
    replayability_prediction:  String(replayability_prediction),
    emotional_stickiness:      String(emotional_stickiness),
    cinematic_potential:       String(cinematic_potential),
    overall_release_score:     String(overall_release_score),
    sync_tags:                 sync_tags as unknown as Record<string, unknown>,
    producer_compatibility:    producer_compatibility as unknown as Record<string, unknown>,
    simulation_notes:          notes.join(' '),
    confidence_score:          String(sim_confidence),
    rl_metadata: {
      algorithm: 'simulator-v1',
      input_vector: [bp.commercial_accessibility / 100, bp.cinematic_density / 100, bp.emotional_rawness / 100,
        bp.spiritual_intensity / 100, bp.darkness_vs_hope / 100, bp.underground_vs_mainstream / 100,
        bp.organic_vs_synthetic / 100, coherence, (bp.bpm - 40) / 260],
      output_vector: [commercial_score, sync_score, crowd_energy, replayability_prediction, emotional_stickiness, cinematic_potential].map(s => s / 100),
      reward_signal: null,
    } as unknown as Record<string, unknown>,
    simulated_at: new Date(),
  };

  const [sim] = await db
    .insert(sonic_release_simulations)
    .values({ blueprint_id: blueprintId, artist_id: artistId, ...simData })
    .onConflictDoUpdate({ target: sonic_release_simulations.blueprint_id, set: simData })
    .returning();

  return sim;
}

export async function getReleaseSimulation(blueprintId: string) {
  const [sim] = await db
    .select()
    .from(sonic_release_simulations)
    .where(eq(sonic_release_simulations.blueprint_id, blueprintId))
    .limit(1);
  return sim ?? null;
}

export async function getArtistSimulations(artistId: string, limit = 20) {
  return db
    .select({
      id:                       sonic_release_simulations.id,
      blueprint_id:             sonic_release_simulations.blueprint_id,
      overall_release_score:    sonic_release_simulations.overall_release_score,
      commercial_score:         sonic_release_simulations.commercial_score,
      sync_score:               sonic_release_simulations.sync_score,
      crowd_energy:             sonic_release_simulations.crowd_energy,
      replayability_prediction: sonic_release_simulations.replayability_prediction,
      emotional_stickiness:     sonic_release_simulations.emotional_stickiness,
      cinematic_potential:      sonic_release_simulations.cinematic_potential,
      confidence_score:         sonic_release_simulations.confidence_score,
      simulated_at:             sonic_release_simulations.simulated_at,
      primary_genre:            sonic_world_blueprints.primary_genre,
      bpm:                      sonic_world_blueprints.bpm,
      musical_key:              sonic_world_blueprints.musical_key,
    })
    .from(sonic_release_simulations)
    .innerJoin(sonic_world_blueprints, eq(sonic_release_simulations.blueprint_id, sonic_world_blueprints.id))
    .where(eq(sonic_release_simulations.artist_id, artistId))
    .orderBy(desc(sonic_release_simulations.simulated_at))
    .limit(limit);
}

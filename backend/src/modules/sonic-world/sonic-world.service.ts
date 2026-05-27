import { eq, desc, count } from 'drizzle-orm';
import { db } from '../../db';
import {
  creative_sessions,
  song_blueprints,
  sonic_world_blueprints,
} from '../../db/schema';
import { AppError } from '../../middleware/errorHandler';
import { logActivity } from '../../lib/activityLogger';
import { computeSonicWorld } from './sonic-world-engine';
import type { SonicWorldInput, EmotionType, IntentionType, TransformationType } from './sonic-world.types';
import type { GenerateBlueprintInput } from './sonic-world.schema';

export const generateBlueprint = async (
  input: GenerateBlueprintInput,
  userEmail?: string,
) => {
  const [session] = await db
    .select()
    .from(creative_sessions)
    .where(eq(creative_sessions.id, input.session_id))
    .limit(1);

  if (!session) throw new AppError('Session not found', 404);

  const [phase1] = await db
    .select()
    .from(song_blueprints)
    .where(eq(song_blueprints.session_id, input.session_id))
    .orderBy(desc(song_blueprints.created_at))
    .limit(1);

  if (!phase1) {
    throw new AppError(
      'Phase 1 blueprint not found — generate a Music Intelligence blueprint first',
      400,
    );
  }

  const sonicInput: SonicWorldInput = {
    emotion:                 session.emotion as EmotionType,
    intention:               session.intention as IntentionType,
    listener_transformation: session.listener_transformation as TransformationType,
    story:                   session.story,
    bpm:                     phase1.bpm,
    musical_key:             phase1.musical_key,
    scale:                   phase1.scale,
    atmosphere:              phase1.atmosphere,
    cadence_energy:          phase1.cadence_energy,
    chord_direction:         phase1.chord_direction,
    vocal_energy:            phase1.vocal_energy,
    hook_intensity:          phase1.hook_intensity,
  };

  const output = computeSonicWorld(sonicInput);

  const [blueprint] = await db
    .insert(sonic_world_blueprints)
    .values({
      session_id:                input.session_id,
      artist_id:                 input.artist_id,
      primary_genre:             output.primary_genre,
      secondary_genre:           output.secondary_genre,
      rhythm_influence:          output.rhythm_influence,
      sonic_fusion_identity:     output.sonic_fusion_identity,
      drum_style:                output.drum_style,
      percussion_textures:       output.percussion_textures,
      bass_character:            output.bass_character,
      melodic_instruments:       output.melodic_instruments,
      ambient_layers:            output.ambient_layers,
      organic_synthetic_ratio:   output.organic_synthetic_ratio,
      vocal_texture:             output.vocal_texture,
      cadence_energy:            output.cadence_energy,
      harmony_behavior:          output.harmony_behavior,
      emotional_intensity:       output.emotional_intensity,
      vocal_atmosphere:          output.vocal_atmosphere,
      visual_sonic_atmosphere:   output.visual_sonic_atmosphere,
      emotional_weather:         output.emotional_weather,
      scene_energy:              output.scene_energy,
      cinematic_references:      output.cinematic_references,
      bpm:                       output.bpm,
      groove_behavior:           output.groove_behavior,
      movement_energy:           output.movement_energy,
      percussion_complexity:     output.percussion_complexity,
      swing_characteristics:     output.swing_characteristics,
      musical_key:               output.musical_key,
      scale:                     output.scale,
      chord_behavior:            output.chord_behavior,
      emotional_progression:     output.emotional_progression,
      tension_release_behavior:  output.tension_release_behavior,
      hook_intensity:            output.hook_intensity,
      chant_potential:           output.chant_potential,
      replayability:             output.replayability,
      anthem_potential:          output.anthem_potential,
      crowd_engagement_energy:   output.crowd_engagement_energy,
      cinematic_density:         output.cinematic_density,
      spiritual_intensity:       output.spiritual_intensity,
      emotional_rawness:         output.emotional_rawness,
      commercial_accessibility:  output.commercial_accessibility,
      darkness_vs_hope:          output.darkness_vs_hope,
      underground_vs_mainstream: output.underground_vs_mainstream,
      organic_vs_synthetic:      output.organic_vs_synthetic,
      producer_brief:            output.producer_brief,
      coherence_score:           String(output.coherence_score),
      engine_version:            'sw-v1',
    })
    .returning();

  logActivity({
    userEmail,
    eventType:  'sonic_world_generated',
    module:     'sonic-world',
    entityType: 'sonic_world_blueprint',
    entityId:   blueprint.id,
    title:      `Sonic World generated: ${session.name}`,
    description: `Genre: ${output.primary_genre} · BPM: ${output.bpm}`,
  });

  return { session, phase1_blueprint: phase1, sonic_world_blueprint: blueprint };
};

export const getLatestBlueprint = async (sessionId: string) => {
  const [blueprint] = await db
    .select()
    .from(sonic_world_blueprints)
    .where(eq(sonic_world_blueprints.session_id, sessionId))
    .orderBy(desc(sonic_world_blueprints.created_at))
    .limit(1);

  return blueprint ?? null;
};

export const getBlueprintHistory = async (sessionId: string, limit = 20) => {
  return db
    .select()
    .from(sonic_world_blueprints)
    .where(eq(sonic_world_blueprints.session_id, sessionId))
    .orderBy(desc(sonic_world_blueprints.created_at))
    .limit(Math.min(limit, 50));
};

export const getDashboard = async (artistId?: string) => {
  const totalQuery = artistId
    ? db.select({ total: count() }).from(sonic_world_blueprints)
        .where(eq(sonic_world_blueprints.artist_id, artistId))
    : db.select({ total: count() }).from(sonic_world_blueprints);

  const [{ total: blueprintCount }] = await totalQuery;

  const recentQuery = artistId
    ? db.select().from(sonic_world_blueprints)
        .where(eq(sonic_world_blueprints.artist_id, artistId))
        .orderBy(desc(sonic_world_blueprints.created_at))
        .limit(5)
    : db.select().from(sonic_world_blueprints)
        .orderBy(desc(sonic_world_blueprints.created_at))
        .limit(5);

  const recent = await recentQuery;

  return {
    blueprint_count: Number(blueprintCount),
    recent_blueprints: recent,
  };
};

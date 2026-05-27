import { eq, desc, count } from 'drizzle-orm';
import { db } from '../../db';
import {
  creative_sessions,
  song_blueprints,
  sonic_world_blueprints,
  sonic_preferences,
} from '../../db/schema';
import { AppError } from '../../middleware/errorHandler';
import { logActivity } from '../../lib/activityLogger';
import { computeSonicWorld } from './sonic-world-engine';
import { stabilizeSonicWorld } from './sonic-world-stabilizer';
import { sonicWorldOutputSchema } from './sonic-world.schema';
import {
  logRepairEvent,
  logFallbackUsage,
  logFailedGeneration,
  logValidationWarning,
} from './sonic-world-logger';
import { ingestBlueprintMemory } from './sonic-memory.service';
import type { SonicWorldInput, EmotionType, IntentionType, TransformationType } from './sonic-world.types';
import type { GenerateBlueprintInput, RecordPreferenceInput } from './sonic-world.schema';

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

  // ── Compute + Stabilize ────────────────────────────────────────────────────
  let stabilized: ReturnType<typeof stabilizeSonicWorld>;
  try {
    const raw = computeSonicWorld(sonicInput);
    stabilized = stabilizeSonicWorld(raw);
  } catch (err) {
    logFailedGeneration({
      sessionId: input.session_id,
      artistId:  input.artist_id,
      error:     err instanceof Error ? err.message : String(err),
      userEmail,
    });
    throw err;
  }

  const { raw_generation, repaired_generation, validation_report, metadata } = stabilized;

  // ── Zod validation before insert ──────────────────────────────────────────
  const zodResult = sonicWorldOutputSchema.safeParse(repaired_generation);
  if (!zodResult.success) {
    logValidationWarning({
      blueprintId: '(pre-insert)',
      sessionId:   input.session_id,
      warningCount: zodResult.error.errors.length,
      warnings: zodResult.error.errors.map(e => ({
        field: e.path.join('.'),
        issue: e.message,
      })),
    });
  }

  // ── Log validation warnings ────────────────────────────────────────────────
  if (validation_report.warning_count > 0) {
    logValidationWarning({
      blueprintId: '(pre-insert)',
      sessionId:   input.session_id,
      warningCount: validation_report.warning_count,
      warnings: validation_report.warnings.map(w => ({
        field: w.field,
        issue: w.issue,
        value: w.value,
      })),
    });
  }

  const o = repaired_generation;

  // ── DB Insert ──────────────────────────────────────────────────────────────
  const [blueprint] = await db
    .insert(sonic_world_blueprints)
    .values({
      session_id:                input.session_id,
      artist_id:                 input.artist_id,
      // Genre DNA
      primary_genre:             o.primary_genre,
      secondary_genre:           o.secondary_genre,
      rhythm_influence:          o.rhythm_influence,
      sonic_fusion_identity:     o.sonic_fusion_identity,
      // Instrumentation
      drum_style:                o.drum_style,
      percussion_textures:       o.percussion_textures,
      bass_character:            o.bass_character,
      melodic_instruments:       o.melodic_instruments,
      ambient_layers:            o.ambient_layers,
      organic_synthetic_ratio:   o.organic_synthetic_ratio,
      // Vocal Architecture
      vocal_texture:             o.vocal_texture,
      cadence_energy:            o.cadence_energy,
      harmony_behavior:          o.harmony_behavior,
      emotional_intensity:       o.emotional_intensity,
      vocal_atmosphere:          o.vocal_atmosphere,
      // Cinematic Environment
      visual_sonic_atmosphere:   o.visual_sonic_atmosphere,
      emotional_weather:         o.emotional_weather,
      scene_energy:              o.scene_energy,
      cinematic_references:      o.cinematic_references,
      // Rhythm Intelligence
      bpm:                       o.bpm,
      groove_behavior:           o.groove_behavior,
      movement_energy:           o.movement_energy,
      percussion_complexity:     o.percussion_complexity,
      swing_characteristics:     o.swing_characteristics,
      // Harmonic Emotion System
      musical_key:               o.musical_key,
      scale:                     o.scale,
      chord_behavior:            o.chord_behavior,
      emotional_progression:     o.emotional_progression,
      tension_release_behavior:  o.tension_release_behavior,
      // Hook Strategy
      hook_intensity:            o.hook_intensity,
      chant_potential:           o.chant_potential,
      replayability:             o.replayability,
      anthem_potential:          o.anthem_potential,
      crowd_engagement_energy:   o.crowd_engagement_energy,
      // Production Density
      cinematic_density:         o.cinematic_density,
      spiritual_intensity:       o.spiritual_intensity,
      emotional_rawness:         o.emotional_rawness,
      commercial_accessibility:  o.commercial_accessibility,
      darkness_vs_hope:          o.darkness_vs_hope,
      underground_vs_mainstream: o.underground_vs_mainstream,
      organic_vs_synthetic:      o.organic_vs_synthetic,
      // Assembly
      producer_brief:            o.producer_brief,
      coherence_score:           String(o.coherence_score),
      engine_version:            'sw-v2',
      // Stabilization audit
      raw_generation:            raw_generation as unknown as Record<string, unknown>,
      repaired_generation:       repaired_generation as unknown as Record<string, unknown>,
      validation_report:         validation_report as unknown as Record<string, unknown>,
      confidence_score:          String(metadata.confidence_score),
      repair_count:              metadata.repair_count,
      fallback_used:             metadata.fallback_used,
      generation_quality:        metadata.generation_quality,
    })
    .returning();

  // ── Post-insert logs ───────────────────────────────────────────────────────
  if (metadata.repair_count > 0) {
    const repairedFields = validation_report.warnings.map(w => w.field as string);
    logRepairEvent({
      blueprintId:    blueprint.id,
      sessionId:      input.session_id,
      repairCount:    metadata.repair_count,
      repairedFields,
      sessionName:    session.name,
      userEmail,
    });
  }

  if (metadata.fallback_used) {
    const fallbackFields = validation_report.warnings
      .filter(w => w.issue === 'null_or_undefined' || w.issue === 'empty_string')
      .map(w => w.field as string);
    logFallbackUsage({
      blueprintId:    blueprint.id,
      sessionId:      input.session_id,
      affectedFields: fallbackFields,
      userEmail,
    });
  }

  logActivity({
    userEmail,
    eventType:   'sonic_world_generated',
    module:      'sonic-world',
    entityType:  'sonic_world_blueprint',
    entityId:    blueprint.id,
    title:       `Sonic World generated: ${session.name}`,
    description: `Genre: ${o.primary_genre} · BPM: ${o.bpm} · Quality: ${metadata.generation_quality}`,
    metadata: {
      confidence_score:    metadata.confidence_score,
      repair_count:        metadata.repair_count,
      generation_quality:  metadata.generation_quality,
    },
  });

  // ── Memory ingestion (non-blocking) ──────────────────────────────────────────
  ingestBlueprintMemory(blueprint, session.emotion, session.intention).catch((err) => {
    console.error('[SonicWorld:Memory] ingestion failed for blueprint', blueprint.id, err);
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

export const recordPreference = async (input: RecordPreferenceInput, userEmail?: string) => {
  const [pref] = await db
    .insert(sonic_preferences)
    .values({
      blueprint_id:    input.blueprint_id,
      artist_id:       input.artist_id,
      preference_type: input.preference_type,
      metadata:        (input.metadata ?? {}) as Record<string, unknown>,
    })
    .returning();

  logActivity({
    userEmail,
    eventType:   `sonic_world_${input.preference_type}`,
    module:      'sonic-world',
    entityType:  'sonic_world_blueprint',
    entityId:    input.blueprint_id,
    title:       `Blueprint ${input.preference_type}`,
    description: `Preference recorded: ${input.preference_type}`,
    metadata:    { preference_type: input.preference_type },
  });

  return pref;
};

export const removePreference = async (id: string) => {
  const [deleted] = await db
    .delete(sonic_preferences)
    .where(eq(sonic_preferences.id, id))
    .returning();
  if (!deleted) throw new AppError('Preference not found', 404);
  return deleted;
};

export const getBlueprintPreferences = async (blueprintId: string) => {
  return db
    .select()
    .from(sonic_preferences)
    .where(eq(sonic_preferences.blueprint_id, blueprintId))
    .orderBy(desc(sonic_preferences.created_at));
};

export const getArtistPreferences = async (artistId: string) => {
  return db
    .select()
    .from(sonic_preferences)
    .where(eq(sonic_preferences.artist_id, artistId))
    .orderBy(desc(sonic_preferences.created_at));
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
    blueprint_count:   Number(blueprintCount),
    recent_blueprints: recent,
  };
};

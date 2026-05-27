import { eq, desc, count, sql } from 'drizzle-orm';
import { db } from '../../db';
import {
  creative_sessions,
  song_blueprints,
  emotional_profiles,
  artist_memory,
} from '../../db/schema';
import { AppError } from '../../middleware/errorHandler';
import { logActivity } from '../../lib/activityLogger';
import { computeBlueprint } from './blueprint-engine';
import type { CreateSessionInput, UpdateSessionInput } from './music-intelligence.schema';

// ---- Artist memory upsert ----

async function updateArtistMemory(
  artistId: string,
  emotion: string,
  bpm: number,
  musicalKey: string,
): Promise<void> {
  const existing = await db
    .select()
    .from(artist_memory)
    .where(eq(artist_memory.artist_id, artistId))
    .limit(1);

  if (existing.length === 0) {
    await db.insert(artist_memory).values({
      artist_id: artistId,
      dominant_emotion: emotion as typeof artist_memory.$inferInsert['dominant_emotion'],
      recurring_themes: [],
      preferred_keys: [musicalKey],
      avg_bpm_min: bpm,
      avg_bpm_max: bpm,
      session_count: 1,
      last_session_at: new Date(),
    });
    return;
  }

  const mem = existing[0];
  const updatedKeys = Array.from(new Set([...(mem.preferred_keys as string[]), musicalKey])).slice(0, 10);
  const newMin = mem.avg_bpm_min ? Math.min(mem.avg_bpm_min, bpm) : bpm;
  const newMax = mem.avg_bpm_max ? Math.max(mem.avg_bpm_max, bpm) : bpm;

  await db
    .update(artist_memory)
    .set({
      dominant_emotion: emotion as typeof artist_memory.$inferInsert['dominant_emotion'],
      preferred_keys: updatedKeys,
      avg_bpm_min: newMin,
      avg_bpm_max: newMax,
      session_count: sql`${artist_memory.session_count} + 1`,
      last_session_at: new Date(),
      updated_at: new Date(),
    })
    .where(eq(artist_memory.artist_id, artistId));
}

// ---- Public service ----

export const createSession = async (
  input: CreateSessionInput,
  userEmail?: string,
) => {
  const blueprint = computeBlueprint({
    emotion: input.emotion,
    intention: input.intention,
    story: input.story,
    listener_transformation: input.listener_transformation,
  });

  const [session] = await db
    .insert(creative_sessions)
    .values({
      artist_id: input.artist_id,
      name: input.name,
      emotion: input.emotion,
      intention: input.intention,
      story: input.story ?? null,
      listener_transformation: input.listener_transformation,
      status: 'active',
    })
    .returning();

  const [bp] = await db
    .insert(song_blueprints)
    .values({
      session_id: session.id,
      artist_id: input.artist_id,
      bpm: blueprint.bpm,
      musical_key: blueprint.musical_key,
      scale: blueprint.scale,
      atmosphere: blueprint.atmosphere,
      cadence_energy: blueprint.cadence_energy,
      chord_direction: blueprint.chord_direction,
      vocal_energy: blueprint.vocal_energy,
      hook_intensity: blueprint.hook_intensity,
      engine_version: 'v1',
    })
    .returning();

  await db.insert(emotional_profiles).values({
    artist_id: input.artist_id,
    session_id: session.id,
    emotion: input.emotion,
    intention: input.intention,
    story: input.story ?? null,
    listener_transformation: input.listener_transformation,
  });

  await updateArtistMemory(input.artist_id, input.emotion, blueprint.bpm, blueprint.musical_key);

  logActivity({
    userEmail,
    eventType: 'session_created',
    module: 'music-intelligence',
    entityType: 'creative_session',
    entityId: session.id,
    title: `Blueprint created: ${input.name}`,
    description: `Emotion: ${input.emotion} · Intention: ${input.intention}`,
  });

  return { session, blueprint: bp };
};

export const listSessions = async (artistId?: string, limit = 50) => {
  const query = db
    .select()
    .from(creative_sessions)
    .orderBy(desc(creative_sessions.created_at))
    .limit(Math.min(limit, 100));

  if (artistId) {
    return query.where(eq(creative_sessions.artist_id, artistId));
  }
  return query;
};

export const getSession = async (id: string) => {
  const [session] = await db
    .select()
    .from(creative_sessions)
    .where(eq(creative_sessions.id, id))
    .limit(1);

  if (!session) throw new AppError('Session not found', 404);

  const blueprints = await db
    .select()
    .from(song_blueprints)
    .where(eq(song_blueprints.session_id, id))
    .orderBy(desc(song_blueprints.created_at));

  return { session, blueprint: blueprints[0] ?? null, blueprint_history: blueprints };
};

export const regenerateBlueprint = async (id: string) => {
  const [session] = await db
    .select()
    .from(creative_sessions)
    .where(eq(creative_sessions.id, id))
    .limit(1);

  if (!session) throw new AppError('Session not found', 404);

  const blueprint = computeBlueprint({
    emotion: session.emotion,
    intention: session.intention,
    story: session.story,
    listener_transformation: session.listener_transformation,
  });

  // Append a variation by appending a different hash seed using current timestamp
  const [bp] = await db
    .insert(song_blueprints)
    .values({
      session_id: session.id,
      artist_id: session.artist_id,
      bpm: blueprint.bpm,
      musical_key: blueprint.musical_key,
      scale: blueprint.scale,
      atmosphere: blueprint.atmosphere,
      cadence_energy: blueprint.cadence_energy,
      chord_direction: blueprint.chord_direction,
      vocal_energy: blueprint.vocal_energy,
      hook_intensity: blueprint.hook_intensity,
      engine_version: 'v1',
    })
    .returning();

  return { session, blueprint: bp };
};

export const updateSession = async (id: string, input: UpdateSessionInput) => {
  const [updated] = await db
    .update(creative_sessions)
    .set({ ...input, updated_at: new Date() })
    .where(eq(creative_sessions.id, id))
    .returning();

  if (!updated) throw new AppError('Session not found', 404);
  return updated;
};

export const deleteSession = async (id: string) => {
  const [deleted] = await db
    .delete(creative_sessions)
    .where(eq(creative_sessions.id, id))
    .returning();

  if (!deleted) throw new AppError('Session not found', 404);
  return { deleted: true };
};

export const getArtistMemory = async (artistId: string) => {
  const [memory] = await db
    .select()
    .from(artist_memory)
    .where(eq(artist_memory.artist_id, artistId))
    .limit(1);

  return memory ?? null;
};

export const getDashboard = async (artistId?: string) => {
  const sessionQuery = artistId
    ? db.select({ total: count() }).from(creative_sessions).where(eq(creative_sessions.artist_id, artistId))
    : db.select({ total: count() }).from(creative_sessions);

  const [{ total: sessionCount }] = await sessionQuery;

  const blueprintQuery = artistId
    ? db.select({ total: count() }).from(song_blueprints).where(eq(song_blueprints.artist_id, artistId))
    : db.select({ total: count() }).from(song_blueprints);

  const [{ total: blueprintCount }] = await blueprintQuery;

  const recentSessions = artistId
    ? await db.select().from(creative_sessions)
        .where(eq(creative_sessions.artist_id, artistId))
        .orderBy(desc(creative_sessions.created_at))
        .limit(5)
    : await db.select().from(creative_sessions)
        .orderBy(desc(creative_sessions.created_at))
        .limit(5);

  const emotionRows = artistId
    ? await db.select({ emotion: creative_sessions.emotion, total: count() })
        .from(creative_sessions)
        .where(eq(creative_sessions.artist_id, artistId))
        .groupBy(creative_sessions.emotion)
        .limit(12)
    : await db.select({ emotion: creative_sessions.emotion, total: count() })
        .from(creative_sessions)
        .groupBy(creative_sessions.emotion)
        .limit(12);

  return {
    session_count: Number(sessionCount),
    blueprint_count: Number(blueprintCount),
    recent_sessions: recentSessions,
    emotion_distribution: emotionRows,
  };
};

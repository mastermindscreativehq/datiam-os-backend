import { eq, and, desc } from 'drizzle-orm';
import { db } from '../../db';
import {
  playlists,
  playlist_pitches,
  playlist_placements,
  playlist_analytics,
  playlist_outreach_history,
  playlist_campaigns,
} from '../../db/growth-schema';
import { AppError } from '../../middleware/errorHandler';
import type {
  CreatePlaylistInput,
  UpdatePlaylistInput,
  CreatePitchInput,
  UpdatePitchStatusInput,
  CreatePlacementInput,
  CreateAnalyticsInput,
  RecordOutreachTouchInput,
  LinkCampaignInput,
} from './playlists.schema';

// ── playlists ─────────────────────────────────────────────────────────────────

export const createPlaylist = async (input: CreatePlaylistInput) => {
  const [playlist] = await db
    .insert(playlists)
    .values({
      ...input,
      genre_tags: input.genre_tags ?? [],
    })
    .returning();
  return playlist;
};

export const getPlaylists = async (filters: { type?: string; dsp?: string } = {}) => {
  const conditions = [];
  if (filters.type) conditions.push(eq(playlists.type, filters.type as any));
  if (filters.dsp) conditions.push(eq(playlists.dsp, filters.dsp as any));

  const query = db.select().from(playlists).orderBy(desc(playlists.created_at));
  if (conditions.length === 0) return query;
  return query.where(and(...conditions));
};

export const getPlaylistById = async (id: string) => {
  const [playlist] = await db.select().from(playlists).where(eq(playlists.id, id));
  if (!playlist) throw new AppError('Playlist not found', 404);
  return playlist;
};

export const updatePlaylist = async (id: string, input: UpdatePlaylistInput) => {
  const [updated] = await db
    .update(playlists)
    .set({ ...input, updated_at: new Date() })
    .where(eq(playlists.id, id))
    .returning();
  if (!updated) throw new AppError('Playlist not found', 404);
  return updated;
};

export const deletePlaylist = async (id: string) => {
  const [deleted] = await db.delete(playlists).where(eq(playlists.id, id)).returning();
  if (!deleted) throw new AppError('Playlist not found', 404);
  return { deleted: true, id };
};

// ── pitches ───────────────────────────────────────────────────────────────────

export const createPitch = async (input: CreatePitchInput) => {
  const [pitch] = await db.insert(playlist_pitches).values(input).returning();
  return pitch;
};

export const getPitchesByPlaylist = async (playlistId: string) => {
  return db
    .select()
    .from(playlist_pitches)
    .where(eq(playlist_pitches.playlist_id, playlistId))
    .orderBy(desc(playlist_pitches.created_at));
};

export const getPitchesBySong = async (songId: string) => {
  return db
    .select()
    .from(playlist_pitches)
    .where(eq(playlist_pitches.song_id, songId))
    .orderBy(desc(playlist_pitches.created_at));
};

export const updatePitchStatus = async (id: string, input: UpdatePitchStatusInput) => {
  const isDecision = input.status === 'accepted' || input.status === 'rejected';
  const [updated] = await db
    .update(playlist_pitches)
    .set({
      status: input.status,
      decision_note: input.decision_note,
      decided_at: isDecision ? new Date() : undefined,
      updated_at: new Date(),
    })
    .where(eq(playlist_pitches.id, id))
    .returning();
  if (!updated) throw new AppError('Playlist pitch not found', 404);
  return updated;
};

// ── placements ────────────────────────────────────────────────────────────────

export const recordPlacement = async (input: CreatePlacementInput) => {
  const [placement] = await db
    .insert(playlist_placements)
    .values({ ...input, added_at: new Date(input.added_at) })
    .returning();
  return placement;
};

export const getPlacementsByPlaylist = async (playlistId: string) => {
  return db
    .select()
    .from(playlist_placements)
    .where(eq(playlist_placements.playlist_id, playlistId))
    .orderBy(desc(playlist_placements.added_at));
};

export const getPlacementsBySong = async (songId: string) => {
  return db
    .select()
    .from(playlist_placements)
    .where(eq(playlist_placements.song_id, songId))
    .orderBy(desc(playlist_placements.added_at));
};

export const removePlacement = async (id: string) => {
  const [updated] = await db
    .update(playlist_placements)
    .set({ removed_at: new Date() })
    .where(eq(playlist_placements.id, id))
    .returning();
  if (!updated) throw new AppError('Playlist placement not found', 404);
  return updated;
};

// ── analytics ─────────────────────────────────────────────────────────────────

export const recordAnalyticsSnapshot = async (input: CreateAnalyticsInput) => {
  const [snapshot] = await db
    .insert(playlist_analytics)
    .values({
      ...input,
      skip_rate: input.skip_rate !== undefined ? input.skip_rate.toString() : undefined,
    })
    .returning();
  return snapshot;
};

export const getAnalyticsByPlacement = async (placementId: string) => {
  return db
    .select()
    .from(playlist_analytics)
    .where(eq(playlist_analytics.placement_id, placementId))
    .orderBy(desc(playlist_analytics.snapshot_date));
};

// ── outreach history ──────────────────────────────────────────────────────────
// Called by the outreach module (never a direct table write from outreach)
// whenever an outreach touch is tied to a playlist.

export const recordOutreachTouch = async (input: RecordOutreachTouchInput) => {
  const [entry] = await db.insert(playlist_outreach_history).values(input).returning();
  return entry;
};

export const getOutreachHistory = async (playlistId: string) => {
  return db
    .select()
    .from(playlist_outreach_history)
    .where(eq(playlist_outreach_history.playlist_id, playlistId))
    .orderBy(desc(playlist_outreach_history.occurred_at));
};

// ── campaign links ────────────────────────────────────────────────────────────

export const linkCampaign = async (input: LinkCampaignInput) => {
  const [link] = await db.insert(playlist_campaigns).values(input).returning();
  return link;
};

export const getCampaignsForPlaylist = async (playlistId: string) => {
  return db
    .select()
    .from(playlist_campaigns)
    .where(eq(playlist_campaigns.playlist_id, playlistId));
};

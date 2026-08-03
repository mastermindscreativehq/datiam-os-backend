import { eq, desc, and, type SQL } from 'drizzle-orm';
import { db } from '../../db';
import { releases, release_tasks, release_checklists } from '../../db/schema';
import { AppError } from '../../middleware/errorHandler';
import { triggerReleaseIntelAnalysis } from '../release-intel/release-intel.worker';
import {
  computeReleaseState,
  enforceReleaseState,
  getMissingGateFields,
  type ReleaseState,
  type ChecklistSnapshot,
} from './releaseStateEngine';
import type {
  CreateReleaseInput,
  UpdateReleaseInput,
  CreateReleaseTaskInput,
  UpdateReleaseTaskInput,
  UpdateChecklistInput,
} from './releases.schema';

const slugify = (str: string) =>
  str.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

function mapRelease(r: typeof releases.$inferSelect) {
  return {
    ...r,
    title: r.release_title,
    type: r.release_type,
    status: r.music_status,
  };
}

export type MappedRelease = ReturnType<typeof mapRelease>;

export interface StateChange {
  prev: ReleaseState;
  next: ReleaseState;
}

// Recomputes and persists release_state; returns the change if state actually changed.
async function syncReleaseState(releaseId: string): Promise<StateChange | null> {
  const [release] = await db
    .select({ id: releases.id, release_date: releases.release_date, release_state: releases.release_state })
    .from(releases)
    .where(eq(releases.id, releaseId))
    .limit(1);
  if (!release) return null;

  const [checklist] = await db
    .select()
    .from(release_checklists)
    .where(eq(release_checklists.release_id, releaseId))
    .limit(1);

  const snapshot: ChecklistSnapshot | null = checklist ?? null;
  const next = computeReleaseState({ release_date: release.release_date }, snapshot);
  const prev = release.release_state as ReleaseState;

  if (next === prev) return null;

  await db
    .update(releases)
    .set({ release_state: next, updated_at: new Date() })
    .where(eq(releases.id, releaseId));

  return { prev, next };
}

// ── Shared release write core ─────────────────────────────────────────────────
//
// This is the ONE place that INSERTs/UPDATEs/DELETEs `releases`. Three
// modules used to write this table independently: this one (releases/,
// music-readiness fields + gate enforcement via releaseStateEngine),
// catalog-engine/releases.service.ts (its own `status`/catalog_release_type/
// preorder_date fields), and release-intelligence/release-intelligence.
// service.ts (an arbitrary-field patch that — critically — could set
// `music_status` straight to 'scheduled'/'released' with NO gate check,
// bypassing enforceReleaseState entirely; found via Phase 4b analysis).
// Each module still owns its own request-schema validation, response
// shaping, and event/webhook dispatch — they delegate the actual row
// write, gate enforcement, and release_state sync here.

export interface ReleaseCoreWriteInput {
  artist_id?: string;
  song_id?: string | null;
  release_title?: string;
  release_type?: 'single' | 'ep' | 'album';
  slug?: string;
  music_status?: 'draft' | 'scheduled' | 'released';
  status?: 'planning' | 'submitted' | 'approved' | 'live';
  genre?: string;
  release_date?: string;
  cover_art_url?: string | null;
  description?: string;
  upc?: string;
  total_tracks?: number;
  distributor?: string;
  pre_save_url?: string | null;
  smart_link?: string | null;
  spotify_url?: string | null;
  apple_music_url?: string | null;
  audiomack_url?: string | null;
  boomplay_url?: string | null;
  youtube_url?: string | null;
  deezer_url?: string | null;
  tidal_url?: string | null;
  amazon_music_url?: string | null;
  youtube_music_url?: string | null;
  soundcloud_url?: string | null;
  preorder_date?: string | null;
  catalog_release_type?: string;
  territories?: string[];
  primary_isrc?: string;
}

export const createReleaseCore = async (input: ReleaseCoreWriteInput) => {
  const { release_title, slug, ...rest } = input;
  const [release] = await db
    .insert(releases)
    .values({
      ...rest,
      release_title,
      slug: slug ?? (release_title ? slugify(release_title) : undefined),
    } as typeof releases.$inferInsert)
    .returning();
  triggerReleaseIntelAnalysis(release.id);
  return release;
};

// Gate enforcement + release_state sync apply here regardless of which
// module's wrapper called this — closing the release-intelligence bypass
// where `music_status` could be set to 'scheduled'/'released' with no check.
export const updateReleaseCore = async (
  id: string,
  input: ReleaseCoreWriteInput,
): Promise<{ release: typeof releases.$inferSelect; stateChange: StateChange | null }> => {
  const { release_title, music_status, ...rest } = input;
  const patch: Record<string, unknown> = { ...rest, updated_at: new Date() };
  if (release_title !== undefined) {
    patch.release_title = release_title;
    if (input.slug === undefined) patch.slug = slugify(release_title);
  }

  if (music_status !== undefined) {
    if (music_status === 'scheduled' || music_status === 'released') {
      const [checklist] = await db
        .select()
        .from(release_checklists)
        .where(eq(release_checklists.release_id, id))
        .limit(1);

      const [existing] = await db
        .select({ release_date: releases.release_date })
        .from(releases)
        .where(eq(releases.id, id))
        .limit(1);

      const releaseSnap = {
        release_date: input.release_date ?? existing?.release_date ?? null,
      };

      enforceReleaseState(music_status, releaseSnap, checklist ?? null);
    }
    patch.music_status = music_status;
  }

  const [updated] = await db
    .update(releases)
    .set(patch)
    .where(eq(releases.id, id))
    .returning();
  if (!updated) throw new AppError('Release not found', 404);

  const stateChange = await syncReleaseState(id);
  return { release: updated, stateChange };
};

export const deleteReleaseCore = async (id: string) => {
  const [deleted] = await db.delete(releases).where(eq(releases.id, id)).returning();
  if (!deleted) throw new AppError('Release not found', 404);
  return { deleted: true, id };
};

// ── Legacy Music-Core-v1 surface — validates via releases.schema, delegates
// the actual write to the core above ──────────────────────────────────────────

export const createRelease = async (input: CreateReleaseInput): Promise<MappedRelease> => {
  const { title, type, status, ...rest } = input;
  const release = await createReleaseCore({
    ...rest,
    release_title: title,
    release_type: type,
    music_status: status ?? 'draft',
  });
  return mapRelease(release);
};

export interface ReleaseFilters {
  artist_id?: string;
  status?: string;
  type?: string;
  genre?: string;
}

export const getReleases = async (filters: ReleaseFilters = {}): Promise<MappedRelease[]> => {
  const conditions: SQL<unknown>[] = [];
  if (filters.artist_id) conditions.push(eq(releases.artist_id, filters.artist_id));
  if (filters.status) conditions.push(eq(releases.music_status, filters.status as 'draft' | 'scheduled' | 'released'));
  if (filters.type) conditions.push(eq(releases.release_type, filters.type as 'single' | 'ep' | 'album'));
  if (filters.genre) conditions.push(eq(releases.genre, filters.genre));

  const rows = await db
    .select()
    .from(releases)
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(desc(releases.created_at));

  return rows.map(mapRelease);
};

export const getReleaseById = async (id: string): Promise<MappedRelease> => {
  const [release] = await db
    .select()
    .from(releases)
    .where(eq(releases.id, id))
    .limit(1);
  if (!release) throw new AppError('Release not found', 404);
  return mapRelease(release);
};

const CHECKLIST_BOOLEAN_FIELDS = [
  'lyrics_ready',
  'cover_art_ready',
  'mix_ready',
  'master_ready',
  'metadata_ready',
  'isrc_ready',
  'upc_ready',
  'distributor_ready',
  'release_date_ready',
  'promo_assets_ready',
  'sync_assets_ready',
  'final_approval',
] as const;

function calcCompletion(row: Record<string, unknown>): { completion_percent: number; readiness_status: string } {
  const total = CHECKLIST_BOOLEAN_FIELDS.length;
  const done = CHECKLIST_BOOLEAN_FIELDS.filter(f => row[f] === true).length;
  const pct = Math.round((done / total) * 100);
  let readiness_status = 'not_ready';
  if (pct === 100) readiness_status = 'ready_for_distribution';
  else if (pct >= 60) readiness_status = 'almost_ready';
  return { completion_percent: pct, readiness_status };
}

export const updateRelease = async (
  id: string,
  input: UpdateReleaseInput,
): Promise<{ release: MappedRelease; stateChange: StateChange | null }> => {
  const { title, type, status, ...rest } = input;
  // Only include keys the caller actually provided — drizzle's .set() writes
  // an explicit `undefined`-valued key as SQL NULL rather than skipping it,
  // so title/type/status must be added conditionally, not spread blind.
  const coreInput: ReleaseCoreWriteInput = { ...rest };
  if (title !== undefined) coreInput.release_title = title;
  if (type !== undefined) coreInput.release_type = type;
  if (status !== undefined) coreInput.music_status = status;

  const { release, stateChange } = await updateReleaseCore(id, coreInput);
  return { release: mapRelease(release), stateChange };
};

export const deleteRelease = async (id: string): Promise<{ deleted: boolean; id: string }> => {
  return deleteReleaseCore(id);
};

export const createReleaseTask = async (releaseId: string, input: CreateReleaseTaskInput) => {
  const [task] = await db
    .insert(release_tasks)
    .values({ release_id: releaseId, ...input })
    .returning();
  return task;
};

export const getReleaseTasks = async (releaseId: string) => {
  return db
    .select()
    .from(release_tasks)
    .where(eq(release_tasks.release_id, releaseId))
    .orderBy(release_tasks.task_category);
};

export const updateReleaseTask = async (id: string, input: UpdateReleaseTaskInput) => {
  const [updated] = await db
    .update(release_tasks)
    .set(input)
    .where(eq(release_tasks.id, id))
    .returning();
  if (!updated) throw new AppError('Task not found', 404);
  return updated;
};

export const getOrCreateChecklist = async (releaseId: string) => {
  const [release] = await db
    .select()
    .from(releases)
    .where(eq(releases.id, releaseId))
    .limit(1);
  if (!release) throw new AppError('Release not found', 404);

  const [existing] = await db
    .select()
    .from(release_checklists)
    .where(eq(release_checklists.release_id, releaseId))
    .limit(1);
  if (existing) return existing;

  const [created] = await db
    .insert(release_checklists)
    .values({ release_id: releaseId })
    .returning();
  return created;
};

export const updateChecklist = async (
  releaseId: string,
  input: UpdateChecklistInput,
): Promise<{ checklist: typeof release_checklists.$inferSelect; stateChange: StateChange | null }> => {
  await getOrCreateChecklist(releaseId);

  const [persisted] = await db
    .select()
    .from(release_checklists)
    .where(eq(release_checklists.release_id, releaseId))
    .limit(1);

  const merged = { ...persisted, ...input };
  const { completion_percent, readiness_status } = calcCompletion(merged);

  const [updated] = await db
    .update(release_checklists)
    .set({ ...input, completion_percent, readiness_status, updated_at: new Date() })
    .where(eq(release_checklists.release_id, releaseId))
    .returning();

  const stateChange = await syncReleaseState(releaseId);
  return { checklist: updated, stateChange };
};

export const getReleaseState = async (releaseId: string) => {
  const [release] = await db
    .select({ id: releases.id, release_date: releases.release_date, release_state: releases.release_state })
    .from(releases)
    .where(eq(releases.id, releaseId))
    .limit(1);
  if (!release) throw new AppError('Release not found', 404);

  const [checklist] = await db
    .select()
    .from(release_checklists)
    .where(eq(release_checklists.release_id, releaseId))
    .limit(1);

  const snapshot: ChecklistSnapshot | null = checklist ?? null;
  const computed = computeReleaseState({ release_date: release.release_date }, snapshot);
  const missing = getMissingGateFields(snapshot);

  return {
    release_state: computed,
    persisted_state: release.release_state,
    completion_percent: checklist?.completion_percent ?? 0,
    readiness_status: checklist?.readiness_status ?? 'not_ready',
    missing_gate_fields: missing,
    is_schedulable: missing.length === 0 && !!release.release_date,
    is_releasable: missing.length === 0,
  };
};

import { eq, desc, and, type SQL } from 'drizzle-orm';
import { db } from '../../db';
import { releases, release_tasks, release_checklists } from '../../db/schema';
import { AppError } from '../../middleware/errorHandler';
import type {
  CreateReleaseInput,
  UpdateReleaseInput,
  CreateReleaseTaskInput,
  UpdateReleaseTaskInput,
  UpdateChecklistInput,
} from './releases.schema';

const slugify = (str: string) =>
  str.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

// Maps DB row → Music Core v1 API shape
function mapRelease(r: typeof releases.$inferSelect) {
  return {
    ...r,
    title: r.release_title,
    type: r.release_type,
    status: r.music_status,
  };
}

export type MappedRelease = ReturnType<typeof mapRelease>;

export const createRelease = async (input: CreateReleaseInput): Promise<MappedRelease> => {
  const { title, type, status, slug, ...rest } = input;
  const [release] = await db
    .insert(releases)
    .values({
      ...rest,
      release_title: title,
      release_type: type,
      music_status: status ?? 'draft',
      slug: slug ?? slugify(title),
    })
    .returning();
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

const GATE_FIELDS = [
  'metadata_ready',
  'cover_art_ready',
  'mix_ready',
  'master_ready',
  'distributor_ready',
  'release_date_ready',
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
): Promise<MappedRelease> => {
  const { title, type, status, slug, ...rest } = input;
  const patch: Record<string, unknown> = { ...rest, updated_at: new Date() };
  if (title !== undefined) {
    patch.release_title = title;
    if (slug === undefined) patch.slug = slugify(title);
  }
  if (slug !== undefined) patch.slug = slug;
  if (type !== undefined) patch.release_type = type;
  if (status !== undefined) {
    // Gate: moving to scheduled or released requires checklist approval
    if (status === 'scheduled' || status === 'released') {
      const [checklist] = await db
        .select()
        .from(release_checklists)
        .where(eq(release_checklists.release_id, id))
        .limit(1);
      if (!checklist) {
        throw new AppError(
          'Release is not ready for scheduling. Complete the required checklist first.',
          400,
        );
      }
      const missing = GATE_FIELDS.filter(f => !checklist[f]);
      if (missing.length > 0) {
        throw new AppError(
          'Release is not ready for scheduling. Complete the required checklist first.',
          400,
        );
      }
    }
    patch.music_status = status;
  }

  const [updated] = await db
    .update(releases)
    .set(patch)
    .where(eq(releases.id, id))
    .returning();
  if (!updated) throw new AppError('Release not found', 404);
  return mapRelease(updated);
};

export const deleteRelease = async (id: string): Promise<{ deleted: boolean; id: string }> => {
  const [deleted] = await db.delete(releases).where(eq(releases.id, id)).returning();
  if (!deleted) throw new AppError('Release not found', 404);
  return { deleted: true, id };
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
  // Verify release exists
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

export const updateChecklist = async (releaseId: string, input: UpdateChecklistInput) => {
  // Ensure checklist row exists
  await getOrCreateChecklist(releaseId);

  const { completion_percent, readiness_status } = calcCompletion({
    // Start from the persisted row, overlay with incoming changes
    ...(await db.select().from(release_checklists).where(eq(release_checklists.release_id, releaseId)).limit(1))[0],
    ...input,
  });

  const [updated] = await db
    .update(release_checklists)
    .set({ ...input, completion_percent, readiness_status, updated_at: new Date() })
    .where(eq(release_checklists.release_id, releaseId))
    .returning();
  return updated;
};

import { eq, desc, and, type SQL } from 'drizzle-orm';
import { db } from '../../db';
import { releases, release_tasks } from '../../db/schema';
import { AppError } from '../../middleware/errorHandler';
import type {
  CreateReleaseInput,
  UpdateReleaseInput,
  CreateReleaseTaskInput,
  UpdateReleaseTaskInput,
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
  if (status !== undefined) patch.music_status = status;

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

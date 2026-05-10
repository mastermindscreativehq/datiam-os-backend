import { eq } from 'drizzle-orm';
import { db } from '../../db';
import { releases, release_tasks } from '../../db/schema';
import { AppError } from '../../middleware/errorHandler';
import type {
  CreateReleaseInput,
  UpdateReleaseInput,
  CreateReleaseTaskInput,
  UpdateReleaseTaskInput,
} from './releases.schema';

export const createRelease = async (input: CreateReleaseInput) => {
  const [release] = await db.insert(releases).values(input).returning();
  return release;
};

export const getReleases = async () => {
  return db.select().from(releases).orderBy(releases.created_at);
};

export const getReleaseById = async (id: string) => {
  const [release] = await db.select().from(releases).where(eq(releases.id, id)).limit(1);
  if (!release) throw new AppError('Release not found', 404);
  return release;
};

export const updateRelease = async (id: string, input: UpdateReleaseInput) => {
  const [updated] = await db
    .update(releases)
    .set({ ...input, updated_at: new Date() })
    .where(eq(releases.id, id))
    .returning();
  if (!updated) throw new AppError('Release not found', 404);
  return updated;
};

export const createReleaseTask = async (releaseId: string, input: CreateReleaseTaskInput) => {
  const [task] = await db
    .insert(release_tasks)
    .values({ release_id: releaseId, ...input })
    .returning();
  return task;
};

export const getReleaseTasks = async (releaseId: string) => {
  return db.select().from(release_tasks).where(eq(release_tasks.release_id, releaseId));
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

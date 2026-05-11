import { eq } from 'drizzle-orm';
import { db } from '../../db';
import { content_ideas } from '../../db/schema';
import { AppError } from '../../middleware/errorHandler';
import type { CreateContentIdeaInput, UpdateContentIdeaInput } from './content.schema';

export const createContentIdea = async (input: CreateContentIdeaInput) => {
  const [idea] = await db.insert(content_ideas).values(input).returning();
  return idea;
};

export const getContentIdeas = async () => {
  return db.select().from(content_ideas).orderBy(content_ideas.created_at);
};

export const updateContentIdea = async (id: string, input: UpdateContentIdeaInput) => {
  const [updated] = await db
    .update(content_ideas)
    .set(input)
    .where(eq(content_ideas.id, id))
    .returning();
  if (!updated) throw new AppError('Content idea not found', 404);
  return updated;
};

export const deleteContentIdea = async (id: string) => {
  const [deleted] = await db.delete(content_ideas).where(eq(content_ideas.id, id)).returning();
  if (!deleted) throw new AppError('Content idea not found', 404);
  return { deleted: true, id };
};

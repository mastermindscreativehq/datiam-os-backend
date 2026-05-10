import { eq } from 'drizzle-orm';
import { db } from '../../db';
import { crm_contacts } from '../../db/schema';
import { AppError } from '../../middleware/errorHandler';
import type { CreateCrmContactInput, UpdateCrmContactInput } from './crm.schema';

export const createContact = async (input: CreateCrmContactInput) => {
  const [contact] = await db.insert(crm_contacts).values(input).returning();
  return contact;
};

export const getContacts = async () => {
  return db.select().from(crm_contacts).orderBy(crm_contacts.created_at);
};

export const updateContact = async (id: string, input: UpdateCrmContactInput) => {
  const [updated] = await db
    .update(crm_contacts)
    .set(input)
    .where(eq(crm_contacts.id, id))
    .returning();
  if (!updated) throw new AppError('Contact not found', 404);
  return updated;
};

import { eq, and, isNull, lte, desc, count, not, inArray } from 'drizzle-orm';
import { db } from '../../db';
import { licensing_contacts, contactRelationshipStatusEnum } from '../../db/schema';
import { AppError } from '../../middleware/errorHandler';
import type { CreateContactInput, UpdateContactInput } from './licensing-contacts.schema';

type RelationshipStatus = typeof contactRelationshipStatusEnum.enumValues[number];

export interface ContactListQuery {
  artist_id?:           string;
  company_id?:          string;
  relationship_status?: string;
  page?:                number;
  limit?:               number;
}

export const listContacts = async (query: ContactListQuery = {}) => {
  const { artist_id, company_id, relationship_status, page = 1, limit = 20 } = query;
  const offset = (page - 1) * limit;

  const conditions = [isNull(licensing_contacts.deleted_at)] as ReturnType<typeof eq>[];
  if (artist_id)           conditions.push(eq(licensing_contacts.artist_id,           artist_id));
  if (company_id)          conditions.push(eq(licensing_contacts.company_id,          company_id));
  if (relationship_status) conditions.push(eq(licensing_contacts.relationship_status, relationship_status as RelationshipStatus));

  const where = and(...conditions);

  const [rows, [{ total }]] = await Promise.all([
    db.select().from(licensing_contacts).where(where).orderBy(desc(licensing_contacts.created_at)).limit(limit).offset(offset),
    db.select({ total: count() }).from(licensing_contacts).where(where),
  ]);

  return { data: rows, total: Number(total), page, limit };
};

export const getContactById = async (id: string) => {
  const [contact] = await db
    .select()
    .from(licensing_contacts)
    .where(and(eq(licensing_contacts.id, id), isNull(licensing_contacts.deleted_at)));
  if (!contact) throw new AppError('Licensing contact not found', 404);
  return contact;
};

export const createContact = async (input: CreateContactInput) => {
  const [contact] = await db
    .insert(licensing_contacts)
    .values({
      ...input,
      last_contacted_at: input.last_contacted_at ? new Date(input.last_contacted_at) : undefined,
      next_follow_up_at: input.next_follow_up_at ? new Date(input.next_follow_up_at) : undefined,
    })
    .returning();
  return contact;
};

export const updateContact = async (id: string, input: UpdateContactInput) => {
  const [updated] = await db
    .update(licensing_contacts)
    .set({
      ...input,
      last_contacted_at: input.last_contacted_at ? new Date(input.last_contacted_at) : undefined,
      next_follow_up_at: input.next_follow_up_at ? new Date(input.next_follow_up_at) : undefined,
      updated_at: new Date(),
    })
    .where(and(eq(licensing_contacts.id, id), isNull(licensing_contacts.deleted_at)))
    .returning();
  if (!updated) throw new AppError('Licensing contact not found', 404);
  return updated;
};

export const softDeleteContact = async (id: string) => {
  const [deleted] = await db
    .update(licensing_contacts)
    .set({ deleted_at: new Date() })
    .where(and(eq(licensing_contacts.id, id), isNull(licensing_contacts.deleted_at)))
    .returning({ id: licensing_contacts.id });
  if (!deleted) throw new AppError('Licensing contact not found', 404);
  return { id: deleted.id, deleted: true as const };
};

export const getFollowUpsDue = async () => {
  const now = new Date();
  return db
    .select()
    .from(licensing_contacts)
    .where(
      and(
        isNull(licensing_contacts.deleted_at),
        not(isNull(licensing_contacts.next_follow_up_at)),
        lte(licensing_contacts.next_follow_up_at, now),
        not(inArray(licensing_contacts.relationship_status, ['blacklisted'])),
      ),
    )
    .orderBy(licensing_contacts.next_follow_up_at);
};

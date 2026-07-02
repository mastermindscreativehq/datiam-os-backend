import { eq, desc, and, sql } from 'drizzle-orm';
import { db } from '../../db';
import { crm_contacts } from '../../db/schema';
import {
  contact_groups,
  contact_group_members,
  conversation_history,
} from '../../db/growth-schema';
import { AppError } from '../../middleware/errorHandler';

export interface CreateGroupInput {
  artist_id?: string;
  name: string;
  description?: string;
  color?: string;
  criteria?: unknown;
  created_by?: string;
}

export interface LogConversationInput {
  channel: string;
  direction: string;
  subject?: string;
  body: string;
  sent_at?: Date;
  metadata?: unknown;
  created_by?: string;
}

export class GrowthCRMService {
  // ── Contact Groups ──────────────────────────────────────────────────────────

  async createGroup(input: CreateGroupInput) {
    const [row] = await db
      .insert(contact_groups)
      .values(input as any)
      .returning();
    return row;
  }

  async listGroups(artistId?: string) {
    if (artistId) {
      return db
        .select()
        .from(contact_groups)
        .where(eq(contact_groups.artist_id, artistId))
        .orderBy(contact_groups.name);
    }
    return db.select().from(contact_groups).orderBy(contact_groups.name);
  }

  async getGroupById(id: string) {
    const [row] = await db
      .select()
      .from(contact_groups)
      .where(eq(contact_groups.id, id));
    if (!row) throw new AppError('Contact group not found', 404);
    return row;
  }

  async updateGroup(id: string, input: Partial<CreateGroupInput>) {
    const [row] = await db
      .update(contact_groups)
      .set({ ...(input as any), updated_at: new Date() })
      .where(eq(contact_groups.id, id))
      .returning();
    if (!row) throw new AppError('Contact group not found', 404);
    return row;
  }

  async deleteGroup(id: string) {
    await this.getGroupById(id);
    await db.delete(contact_groups).where(eq(contact_groups.id, id));
  }

  async addToGroup(groupId: string, contactId: string, addedBy?: string) {
    await this.getGroupById(groupId);
    await db
      .insert(contact_group_members)
      .values({ group_id: groupId, contact_id: contactId, added_by: addedBy })
      .onConflictDoNothing();
  }

  async removeFromGroup(groupId: string, contactId: string) {
    await db
      .delete(contact_group_members)
      .where(
        and(
          eq(contact_group_members.group_id, groupId),
          eq(contact_group_members.contact_id, contactId),
        ),
      );
  }

  async getGroupContacts(groupId: string) {
    return db
      .select({ contact: crm_contacts })
      .from(contact_group_members)
      .innerJoin(crm_contacts, eq(contact_group_members.contact_id, crm_contacts.id))
      .where(eq(contact_group_members.group_id, groupId))
      .orderBy(crm_contacts.name);
  }

  async getContactGroups(contactId: string) {
    return db
      .select({ group: contact_groups })
      .from(contact_group_members)
      .innerJoin(contact_groups, eq(contact_group_members.group_id, contact_groups.id))
      .where(eq(contact_group_members.contact_id, contactId));
  }

  // ── Conversation History ────────────────────────────────────────────────────

  async logConversation(contactId: string, input: LogConversationInput) {
    const [row] = await db
      .insert(conversation_history)
      .values({ contact_id: contactId, ...(input as any) })
      .returning();
    return row;
  }

  async getConversations(contactId: string, limit = 50) {
    return db
      .select()
      .from(conversation_history)
      .where(eq(conversation_history.contact_id, contactId))
      .orderBy(desc(conversation_history.sent_at))
      .limit(limit);
  }

  async getRecentConversations(artistId: string, limit = 20) {
    return db
      .select({
        conversation: conversation_history,
        contact: crm_contacts,
      })
      .from(conversation_history)
      .innerJoin(crm_contacts, eq(conversation_history.contact_id, crm_contacts.id))
      .orderBy(desc(conversation_history.sent_at))
      .limit(limit);
  }

  // ── Collaboration Score ─────────────────────────────────────────────────────

  async updateCollaborationScore(contactId: string) {
    const [convCount] = await db
      .select({ total: sql<number>`count(*)` })
      .from(conversation_history)
      .where(eq(conversation_history.contact_id, contactId));

    const score = Math.min(100, (convCount?.total ?? 0) * 5);

    const [row] = await db
      .update(crm_contacts)
      .set({ collaboration_score: score.toString(), updated_at: new Date() } as any)
      .where(eq(crm_contacts.id, contactId))
      .returning();
    return row;
  }

  // ── Priority Contacts ───────────────────────────────────────────────────────

  async getVipContacts(artistId?: string) {
    const query = db
      .select()
      .from(crm_contacts)
      .where(sql`${(crm_contacts as any).priority} = 'vip'`)
      .orderBy(desc((crm_contacts as any).collaboration_score))
      .limit(50);
    return query;
  }

  async getTopCollaborators(limit = 10) {
    return db
      .select()
      .from(crm_contacts)
      .orderBy(desc((crm_contacts as any).collaboration_score))
      .limit(limit);
  }
}

export const growthCRMService = new GrowthCRMService();

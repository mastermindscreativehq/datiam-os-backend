import { eq, desc, and, sql, ilike, inArray } from 'drizzle-orm';
import { db } from '../../db';
import { content_ideas } from '../../db/schema';
import {
  content_versions,
  content_tags,
  content_tag_map,
} from '../../db/growth-schema';
import { AppError } from '../../middleware/errorHandler';

export interface ContentVaultFilter {
  artist_id?: string;
  campaign_id?: string;
  status?: string;
  content_type?: string;
  platform?: string;
  search?: string;
  limit?: number;
  offset?: number;
}

export interface CreateContentInput {
  song_id?: string;
  content_type: string;
  title?: string;
  description?: string;
  artist_id?: string;
  release_id?: string;
  campaign_id?: string;
  hook?: string;
  script?: string;
  caption?: string;
  platform?: string;
  language?: string;
  country_targets?: unknown;
  platform_targets?: unknown;
  mood?: string;
  genre?: string;
  bpm?: number;
  musical_key?: string;
  cta?: string;
  hashtags?: unknown;
  thumbnail_url?: string;
  asset_url?: string;
  video_duration_seconds?: number;
  scheduled_date?: string;
  tags?: unknown;
}

export class ContentVaultService {
  async create(input: CreateContentInput) {
    const [row] = await db
      .insert(content_ideas)
      .values({
        ...(input as any),
        updated_at: new Date(),
      })
      .returning();
    return row;
  }

  async search(filters: ContentVaultFilter) {
    const conditions = [];

    if (filters.artist_id) {
      conditions.push(eq((content_ideas as any).artist_id, filters.artist_id));
    }
    if (filters.campaign_id) {
      conditions.push(eq((content_ideas as any).campaign_id, filters.campaign_id));
    }
    if (filters.status) {
      conditions.push(eq(content_ideas.status, filters.status as any));
    }
    if (filters.content_type) {
      conditions.push(eq(content_ideas.content_type, filters.content_type as any));
    }
    if (filters.platform) {
      conditions.push(eq(content_ideas.platform, filters.platform));
    }
    if (filters.search) {
      conditions.push(
        sql`(${(content_ideas as any).title} ILIKE ${`%${filters.search}%`} OR ${content_ideas.hook} ILIKE ${`%${filters.search}%`})`,
      );
    }

    const query = db
      .select()
      .from(content_ideas)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc((content_ideas as any).updated_at))
      .limit(filters.limit ?? 50)
      .offset(filters.offset ?? 0);

    return query;
  }

  async getById(id: string) {
    const [row] = await db
      .select()
      .from(content_ideas)
      .where(eq(content_ideas.id, id));
    if (!row) throw new AppError('Content asset not found', 404);
    return row;
  }

  async update(id: string, input: Partial<CreateContentInput>) {
    await this.getById(id);
    const [row] = await db
      .update(content_ideas)
      .set({ ...(input as any), updated_at: new Date() })
      .where(eq(content_ideas.id, id))
      .returning();
    return row;
  }

  async delete(id: string) {
    await this.getById(id);
    await db.delete(content_ideas).where(eq(content_ideas.id, id));
  }

  async updatePerformanceScore(id: string, score: number) {
    const [row] = await db
      .update(content_ideas)
      .set({
        performance_score: score.toString(),
        last_published_at: new Date(),
        publish_count: sql`${(content_ideas as any).publish_count} + 1`,
        updated_at: new Date(),
      } as any)
      .where(eq(content_ideas.id, id))
      .returning();
    return row;
  }

  async createVersion(contentId: string, userId: string, changeNote?: string) {
    const content = await this.getById(contentId);
    const [lastVersion] = await db
      .select({ version_number: content_versions.version_number })
      .from(content_versions)
      .where(eq(content_versions.content_id, contentId))
      .orderBy(desc(content_versions.version_number))
      .limit(1);

    const nextVersion = (lastVersion?.version_number ?? 0) + 1;

    const [row] = await db
      .insert(content_versions)
      .values({
        content_id: contentId,
        version_number: nextVersion,
        snapshot: content as any,
        change_note: changeNote,
        created_by: userId,
      })
      .returning();
    return row;
  }

  async getVersions(contentId: string) {
    return db
      .select()
      .from(content_versions)
      .where(eq(content_versions.content_id, contentId))
      .orderBy(desc(content_versions.version_number));
  }

  async createTag(name: string, color?: string) {
    const slug = name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    const [existing] = await db
      .select()
      .from(content_tags)
      .where(eq(content_tags.slug, slug));
    if (existing) return existing;

    const [row] = await db
      .insert(content_tags)
      .values({ name, slug, color: color ?? '#6366f1' })
      .returning();
    return row;
  }

  async getTags() {
    return db.select().from(content_tags).orderBy(content_tags.name);
  }

  async linkTag(contentId: string, tagId: string) {
    await db
      .insert(content_tag_map)
      .values({ content_id: contentId, tag_id: tagId })
      .onConflictDoNothing();
  }

  async unlinkTag(contentId: string, tagId: string) {
    await db
      .delete(content_tag_map)
      .where(
        and(
          eq(content_tag_map.content_id, contentId),
          eq(content_tag_map.tag_id, tagId),
        ),
      );
  }

  async getContentTags(contentId: string) {
    return db
      .select({ tag: content_tags })
      .from(content_tag_map)
      .innerJoin(content_tags, eq(content_tag_map.tag_id, content_tags.id))
      .where(eq(content_tag_map.content_id, contentId));
  }
}

export const contentVaultService = new ContentVaultService();

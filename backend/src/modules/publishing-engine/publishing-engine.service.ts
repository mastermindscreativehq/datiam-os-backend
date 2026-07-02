import { eq, desc, and, sql, gte } from 'drizzle-orm';
import { db } from '../../db';
import {
  scheduled_posts,
  published_posts,
  post_captions,
} from '../../db/growth-schema';
import { AppError } from '../../middleware/errorHandler';
import { growthPublishQueue, enqueueGrowthJob } from '../../queues';

export interface SchedulePostInput {
  content_id?: string;
  social_account_id: string;
  campaign_id?: string;
  caption?: string;
  caption_source?: string;
  hashtags?: unknown;
  media_urls?: unknown;
  scheduled_for: Date;
  metadata?: unknown;
  created_by?: string;
}

export interface PublishQueueFilter {
  social_account_id?: string;
  campaign_id?: string;
  status?: string;
  from?: Date;
  limit?: number;
  offset?: number;
}

export class PublishingEngineService {
  async schedulePost(input: SchedulePostInput) {
    const [row] = await db
      .insert(scheduled_posts)
      .values(input as any)
      .returning();

    // Enqueue immediately if post is due within the next 2 minutes
    const delay = Math.max(0, input.scheduled_for.getTime() - Date.now());
    await enqueueGrowthJob(growthPublishQueue, 'publish-post', {
      scheduled_post_id: row.id,
      user_id: input.created_by ?? null,
    }, { delay });

    return row;
  }

  async getScheduledPosts(filters: PublishQueueFilter) {
    const conditions = [];
    if (filters.social_account_id) {
      conditions.push(eq(scheduled_posts.social_account_id, filters.social_account_id));
    }
    if (filters.campaign_id) {
      conditions.push(eq(scheduled_posts.campaign_id, filters.campaign_id));
    }
    if (filters.status) {
      conditions.push(eq(scheduled_posts.status, filters.status as any));
    }
    if (filters.from) {
      conditions.push(gte(scheduled_posts.scheduled_for, filters.from));
    }

    return db
      .select()
      .from(scheduled_posts)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(scheduled_posts.scheduled_for)
      .limit(filters.limit ?? 50)
      .offset(filters.offset ?? 0);
  }

  async getById(id: string) {
    const [row] = await db
      .select()
      .from(scheduled_posts)
      .where(eq(scheduled_posts.id, id));
    if (!row) throw new AppError('Scheduled post not found', 404);
    return row;
  }

  async updateScheduledPost(id: string, input: Partial<SchedulePostInput> & { status?: string }) {
    await this.getById(id);
    const [row] = await db
      .update(scheduled_posts)
      .set({ ...(input as any), updated_at: new Date() })
      .where(eq(scheduled_posts.id, id))
      .returning();
    return row;
  }

  async cancelPost(id: string) {
    const post = await this.getById(id);
    if (post.status === 'published') {
      throw new AppError('Cannot cancel a published post', 400);
    }
    const [row] = await db
      .update(scheduled_posts)
      .set({ status: 'cancelled', updated_at: new Date() })
      .where(eq(scheduled_posts.id, id))
      .returning();
    return row;
  }

  async markPublishing(id: string) {
    const [row] = await db
      .update(scheduled_posts)
      .set({
        status: 'publishing',
        publish_attempts: sql`${scheduled_posts.publish_attempts} + 1`,
        last_attempt_at: new Date(),
        updated_at: new Date(),
      })
      .where(eq(scheduled_posts.id, id))
      .returning();
    return row;
  }

  async recordPublishSuccess(scheduledPostId: string, platformPostId: string, rawResponse: unknown) {
    await db
      .update(scheduled_posts)
      .set({ status: 'published', updated_at: new Date() })
      .where(eq(scheduled_posts.id, scheduledPostId));

    const post = await this.getById(scheduledPostId);

    const [published] = await db
      .insert(published_posts)
      .values({
        scheduled_post_id: scheduledPostId,
        social_account_id: post.social_account_id,
        platform_post_id: platformPostId,
        raw_response: rawResponse as any,
        published_at: new Date(),
      })
      .returning();
    return published;
  }

  async recordPublishFailure(scheduledPostId: string, errorMessage: string, maxRetries = 3) {
    const post = await this.getById(scheduledPostId);
    const newStatus = (post.publish_attempts ?? 0) >= maxRetries ? 'failed' : 'scheduled';

    const [row] = await db
      .update(scheduled_posts)
      .set({
        status: newStatus as any,
        last_error: errorMessage,
        updated_at: new Date(),
      })
      .where(eq(scheduled_posts.id, scheduledPostId))
      .returning();
    return row;
  }

  async getPublishedPosts(filters: { social_account_id?: string; campaign_id?: string; limit?: number; offset?: number }) {
    const conditions = [];
    if (filters.social_account_id) {
      conditions.push(eq(published_posts.social_account_id, filters.social_account_id));
    }

    return db
      .select()
      .from(published_posts)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(published_posts.published_at))
      .limit(filters.limit ?? 50)
      .offset(filters.offset ?? 0);
  }

  async getDueForPublishing(batchSize = 20) {
    return db
      .select()
      .from(scheduled_posts)
      .where(
        and(
          sql`${scheduled_posts.status} IN ('scheduled', 'failed')`,
          sql`${scheduled_posts.scheduled_for} <= now()`,
          sql`${scheduled_posts.publish_attempts} < 3`,
        ),
      )
      .orderBy(scheduled_posts.scheduled_for)
      .limit(batchSize);
  }

  async saveCaption(scheduledPostId: string, caption: string, source: string, aiModel?: string) {
    const [row] = await db
      .insert(post_captions)
      .values({
        scheduled_post_id: scheduledPostId,
        caption,
        caption_source: source as any,
        ai_model: aiModel,
      })
      .returning();
    return row;
  }

  async approveCaption(captionId: string, userId: string) {
    const [row] = await db
      .update(post_captions)
      .set({ is_approved: true, approved_by: userId, approved_at: new Date() })
      .where(eq(post_captions.id, captionId))
      .returning();
    if (!row) throw new AppError('Caption not found', 404);
    return row;
  }

  async getCaptions(scheduledPostId: string) {
    return db
      .select()
      .from(post_captions)
      .where(eq(post_captions.scheduled_post_id, scheduledPostId))
      .orderBy(desc(post_captions.created_at));
  }
}

export const publishingEngineService = new PublishingEngineService();

import { eq, desc, and, sql, count } from 'drizzle-orm';
import { db } from '../../db';
import { notifications } from '../../db/growth-schema';
import { AppError } from '../../middleware/errorHandler';

export interface CreateNotificationInput {
  user_id: string;
  type?: string;
  category?: string;
  title: string;
  body?: string;
  entity_type?: string;
  entity_id?: string;
  action_url?: string;
  icon?: string;
  metadata?: unknown;
}

export interface NotificationFilter {
  unread_only?: boolean;
  category?: string;
  limit?: number;
  offset?: number;
}

export class NotificationService {
  async create(input: CreateNotificationInput) {
    const [row] = await db
      .insert(notifications)
      .values(input as any)
      .returning();
    return row;
  }

  async bulkCreate(inputs: CreateNotificationInput[]) {
    if (!inputs.length) return [];
    return db.insert(notifications).values(inputs as any).returning();
  }

  async getForUser(userId: string, filters: NotificationFilter = {}) {
    const conditions = [eq(notifications.user_id, userId)];

    if (filters.unread_only) {
      conditions.push(sql`${notifications.read_at} IS NULL AND ${notifications.dismissed_at} IS NULL`);
    }
    if (filters.category) {
      conditions.push(eq(notifications.category, filters.category as any));
    }

    return db
      .select()
      .from(notifications)
      .where(and(...conditions))
      .orderBy(desc(notifications.created_at))
      .limit(filters.limit ?? 50)
      .offset(filters.offset ?? 0);
  }

  async getUnreadCount(userId: string) {
    const [result] = await db
      .select({ count: count() })
      .from(notifications)
      .where(
        and(
          eq(notifications.user_id, userId),
          sql`${notifications.read_at} IS NULL AND ${notifications.dismissed_at} IS NULL`,
        ),
      );
    return result?.count ?? 0;
  }

  async markRead(id: string, userId: string) {
    const [row] = await db
      .update(notifications)
      .set({ read_at: new Date() })
      .where(
        and(
          eq(notifications.id, id),
          eq(notifications.user_id, userId),
        ),
      )
      .returning();
    if (!row) throw new AppError('Notification not found', 404);
    return row;
  }

  async markAllRead(userId: string) {
    await db
      .update(notifications)
      .set({ read_at: new Date() })
      .where(
        and(
          eq(notifications.user_id, userId),
          sql`${notifications.read_at} IS NULL`,
        ),
      );
  }

  async dismiss(id: string, userId: string) {
    const [row] = await db
      .update(notifications)
      .set({ dismissed_at: new Date() })
      .where(
        and(
          eq(notifications.id, id),
          eq(notifications.user_id, userId),
        ),
      )
      .returning();
    if (!row) throw new AppError('Notification not found', 404);
    return row;
  }

  async dismissAll(userId: string) {
    await db
      .update(notifications)
      .set({ dismissed_at: new Date() })
      .where(
        and(
          eq(notifications.user_id, userId),
          sql`${notifications.dismissed_at} IS NULL`,
        ),
      );
  }

  // ── Typed factory helpers used by other services ──────────────────────────

  async notifyCampaignCreated(userId: string, campaignId: string, campaignName: string) {
    return this.create({
      user_id: userId,
      type: 'success',
      category: 'campaign',
      title: 'Campaign created',
      body: `"${campaignName}" is ready. Start adding tasks and content.`,
      entity_type: 'campaign',
      entity_id: campaignId,
      action_url: `/campaigns/${campaignId}`,
      icon: 'megaphone',
    });
  }

  async notifyCampaignStageChanged(userId: string, campaignId: string, campaignName: string, stage: string) {
    return this.create({
      user_id: userId,
      type: 'info',
      category: 'campaign',
      title: 'Campaign stage advanced',
      body: `"${campaignName}" moved to stage: ${stage.replace(/_/g, ' ')}.`,
      entity_type: 'campaign',
      entity_id: campaignId,
      action_url: `/campaigns/${campaignId}`,
      icon: 'arrow-right',
    });
  }

  async notifyContentPublished(userId: string, postId: string, platform: string) {
    return this.create({
      user_id: userId,
      type: 'success',
      category: 'content',
      title: 'Content published',
      body: `Your post went live on ${platform}.`,
      entity_type: 'published_post',
      entity_id: postId,
      action_url: `/publishing/${postId}`,
      icon: 'check-circle',
    });
  }

  async notifyPublishFailed(userId: string, postId: string, platform: string, error: string) {
    return this.create({
      user_id: userId,
      type: 'alert',
      category: 'publishing',
      title: 'Publish failed',
      body: `Post on ${platform} failed: ${error.slice(0, 120)}`,
      entity_type: 'scheduled_post',
      entity_id: postId,
      action_url: `/publishing/${postId}`,
      icon: 'x-circle',
    });
  }

  async notifyTrendDetected(userId: string, trendId: string, trendTitle: string) {
    return this.create({
      user_id: userId,
      type: 'info',
      category: 'trend',
      title: 'New trend detected',
      body: `"${trendTitle}" is gaining momentum. Check content recommendations.`,
      entity_type: 'trend_report',
      entity_id: trendId,
      action_url: `/trends/${trendId}`,
      icon: 'trending-up',
    });
  }

  async notifyAnalyticsSynced(userId: string, platform: string, followersGained: number) {
    return this.create({
      user_id: userId,
      type: 'info',
      category: 'analytics',
      title: 'Analytics synced',
      body: `${platform} data updated. +${followersGained} followers this period.`,
      icon: 'bar-chart',
    });
  }
}

export const notificationService = new NotificationService();

import { eq, desc, and, sql, sum, avg, gte, lte } from 'drizzle-orm';
import { db } from '../../db';
import {
  analytics_snapshots,
  post_analytics,
  platform_metrics,
  social_accounts,
  platform_definitions,
  published_posts,
} from '../../db/growth-schema';
import { content_ideas } from '../../db/schema';
import { AppError } from '../../middleware/errorHandler';
import { growthContentSyncQueue, enqueueGrowthJob } from '../../queues';

export interface IngestSnapshotInput {
  social_account_id: string;
  platform_id: string;
  snapshot_date: string;
  views?: number;
  reach?: number;
  watch_time_seconds?: number;
  likes?: number;
  comments?: number;
  shares?: number;
  saves?: number;
  impressions?: number;
  followers?: number;
  followers_gained?: number;
  streams?: number;
  playlist_adds?: number;
  ctr?: string;
  profile_visits?: number;
  country_breakdown?: unknown;
  device_breakdown?: unknown;
  traffic_breakdown?: unknown;
  raw_data?: unknown;
}

export interface IngestPostAnalyticsInput {
  published_post_id: string;
  snapshot_date: string;
  views?: number;
  reach?: number;
  likes?: number;
  comments?: number;
  shares?: number;
  saves?: number;
  watch_time_seconds?: number;
  engagement_rate?: string;
  raw_data?: unknown;
}

export interface IngestPlatformMetricsInput {
  artist_id: string;
  platform_id: string;
  song_id?: string;
  period_start: string;
  period_end: string;
  total_streams?: number;
  total_views?: number;
  total_reach?: number;
  avg_engagement_rate?: string;
  followers_end?: number;
  followers_change?: number;
  top_country?: string;
  metadata?: unknown;
}

export interface AnalyticsPeriodFilter {
  artist_id?: string;
  platform_id?: string;
  from?: string;
  to?: string;
  limit?: number;
}

export class AnalyticsHubService {
  async ingestSnapshot(input: IngestSnapshotInput) {
    const [row] = await db
      .insert(analytics_snapshots)
      .values(input as any)
      .onConflictDoNothing()
      .returning();
    return row;
  }

  async ingestPostAnalytics(input: IngestPostAnalyticsInput) {
    const [row] = await db
      .insert(post_analytics)
      .values(input as any)
      .onConflictDoNothing()
      .returning();

    // Queue content performance score recalculation after new post analytics land
    if (row) {
      const [pub] = await db
        .select({ content_id: published_posts.id })
        .from(published_posts)
        .where(eq(published_posts.id, input.published_post_id));
      if (pub) {
        await enqueueGrowthJob(growthContentSyncQueue, 'sync-performance', {
          content_id: input.published_post_id,
        }, { delay: 5_000 });
      }
    }

    return row;
  }

  async ingestPlatformMetrics(input: IngestPlatformMetricsInput) {
    const [row] = await db
      .insert(platform_metrics)
      .values(input as any)
      .onConflictDoNothing()
      .returning();
    return row;
  }

  async getOverview(artistId: string, days = 30) {
    const since = new Date();
    since.setDate(since.getDate() - days);
    const sinceStr = since.toISOString().split('T')[0];

    const accountIds = await db
      .select({ id: social_accounts.id })
      .from(social_accounts)
      .where(eq(social_accounts.artist_id, artistId));

    if (!accountIds.length) return { total_views: 0, total_streams: 0, total_reach: 0, total_followers_gained: 0 };

    const ids = accountIds.map((a) => a.id);

    const [totals] = await db
      .select({
        total_views: sum(analytics_snapshots.views),
        total_streams: sum(analytics_snapshots.streams),
        total_reach: sum(analytics_snapshots.reach),
        total_followers_gained: sum(analytics_snapshots.followers_gained),
        total_likes: sum(analytics_snapshots.likes),
        total_comments: sum(analytics_snapshots.comments),
        total_shares: sum(analytics_snapshots.shares),
        total_saves: sum(analytics_snapshots.saves),
      })
      .from(analytics_snapshots)
      .where(
        and(
          sql`${analytics_snapshots.social_account_id} = ANY(${ids})`,
          sql`${analytics_snapshots.snapshot_date} >= ${sinceStr}`,
        ),
      );

    return totals;
  }

  async getByPlatform(artistId: string, days = 30) {
    const since = new Date();
    since.setDate(since.getDate() - days);
    const sinceStr = since.toISOString().split('T')[0];

    return db
      .select({
        platform: platform_definitions.name,
        platform_slug: platform_definitions.slug,
        total_views: sum(analytics_snapshots.views),
        total_streams: sum(analytics_snapshots.streams),
        total_reach: sum(analytics_snapshots.reach),
        total_followers_gained: sum(analytics_snapshots.followers_gained),
      })
      .from(analytics_snapshots)
      .innerJoin(social_accounts, eq(analytics_snapshots.social_account_id, social_accounts.id))
      .innerJoin(platform_definitions, eq(analytics_snapshots.platform_id, platform_definitions.id))
      .where(
        and(
          eq(social_accounts.artist_id, artistId),
          sql`${analytics_snapshots.snapshot_date} >= ${sinceStr}`,
        ),
      )
      .groupBy(platform_definitions.id, platform_definitions.name, platform_definitions.slug)
      .orderBy(desc(sum(analytics_snapshots.views)));
  }

  async getTopContent(artistId: string, limit = 10) {
    return db
      .select({
        post: published_posts,
        total_views: sum(post_analytics.views),
        total_likes: sum(post_analytics.likes),
        total_shares: sum(post_analytics.shares),
        avg_engagement: avg(post_analytics.engagement_rate),
      })
      .from(post_analytics)
      .innerJoin(published_posts, eq(post_analytics.published_post_id, published_posts.id))
      .innerJoin(social_accounts, eq(published_posts.social_account_id, social_accounts.id))
      .where(eq(social_accounts.artist_id, artistId))
      .groupBy(published_posts.id)
      .orderBy(desc(sum(post_analytics.views)))
      .limit(limit);
  }

  async getSnapshots(accountId: string, days = 30) {
    const since = new Date();
    since.setDate(since.getDate() - days);
    const sinceStr = since.toISOString().split('T')[0];

    return db
      .select()
      .from(analytics_snapshots)
      .where(
        and(
          eq(analytics_snapshots.social_account_id, accountId),
          sql`${analytics_snapshots.snapshot_date} >= ${sinceStr}`,
        ),
      )
      .orderBy(desc(analytics_snapshots.snapshot_date));
  }

  async getPlatformMetrics(artistId: string, platformId?: string, songId?: string) {
    const conditions = [eq(platform_metrics.artist_id, artistId)];
    if (platformId) conditions.push(eq(platform_metrics.platform_id, platformId));
    if (songId) conditions.push(eq(platform_metrics.song_id, songId));

    return db
      .select()
      .from(platform_metrics)
      .where(and(...conditions))
      .orderBy(desc(platform_metrics.period_end))
      .limit(50);
  }

  async updateContentPerformanceScore(contentId: string) {
    const [result] = await db
      .select({
        avg_views: avg(post_analytics.views),
        avg_likes: avg(post_analytics.likes),
        avg_engagement: avg(post_analytics.engagement_rate),
      })
      .from(post_analytics)
      .innerJoin(published_posts, eq(post_analytics.published_post_id, published_posts.id))
      .innerJoin(
        social_accounts,
        eq(published_posts.social_account_id, social_accounts.id),
      );

    if (!result) return;

    const score = Math.min(
      100,
      Math.round(
        (Number(result.avg_engagement ?? 0) * 50) +
        (Math.log10(Number(result.avg_views ?? 1) + 1) * 10),
      ),
    );

    await db
      .update(content_ideas)
      .set({ performance_score: score.toString(), updated_at: new Date() } as any)
      .where(eq(content_ideas.id, contentId));

    return score;
  }
}

export const analyticsHubService = new AnalyticsHubService();

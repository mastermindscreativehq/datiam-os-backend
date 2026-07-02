import { eq, desc, and, sql } from 'drizzle-orm';
import { db } from '../../db';
import {
  trend_reports,
  trend_content_recommendations,
  platform_definitions,
} from '../../db/growth-schema';
import { AppError } from '../../middleware/errorHandler';

export interface CreateTrendInput {
  platform_id?: string;
  title: string;
  description?: string;
  category: string;
  trend_score?: number;
  relevance_score?: number;
  difficulty_score?: number;
  audience_overlap?: number;
  hashtags?: unknown;
  example_urls?: unknown;
  regions?: unknown;
  expires_at?: Date;
  ai_analysis?: string;
  raw_data?: unknown;
}

export interface TrendFilter {
  platform_id?: string;
  category?: string;
  status?: string;
  min_trend_score?: number;
  limit?: number;
  offset?: number;
}

export class TrendIntelligenceService {
  async create(input: CreateTrendInput) {
    const [row] = await db
      .insert(trend_reports)
      .values(input as any)
      .returning();
    return row;
  }

  async list(filters: TrendFilter) {
    const conditions = [];
    if (filters.platform_id) conditions.push(eq(trend_reports.platform_id, filters.platform_id));
    if (filters.category) conditions.push(eq(trend_reports.category, filters.category as any));
    if (filters.status) conditions.push(eq(trend_reports.status, filters.status as any));
    if (filters.min_trend_score !== undefined) {
      conditions.push(sql`${trend_reports.trend_score} >= ${filters.min_trend_score}`);
    }

    return db
      .select({
        trend: trend_reports,
        platform: platform_definitions,
      })
      .from(trend_reports)
      .leftJoin(platform_definitions, eq(trend_reports.platform_id, platform_definitions.id))
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(trend_reports.trend_score))
      .limit(filters.limit ?? 50)
      .offset(filters.offset ?? 0);
  }

  async getActiveTrends(platformId?: string, category?: string) {
    const conditions = [eq(trend_reports.status, 'active')];
    if (platformId) conditions.push(eq(trend_reports.platform_id, platformId));
    if (category) conditions.push(eq(trend_reports.category, category as any));

    return db
      .select()
      .from(trend_reports)
      .where(and(...conditions))
      .orderBy(desc(trend_reports.trend_score))
      .limit(20);
  }

  async getById(id: string) {
    const [row] = await db
      .select({
        trend: trend_reports,
        platform: platform_definitions,
      })
      .from(trend_reports)
      .leftJoin(platform_definitions, eq(trend_reports.platform_id, platform_definitions.id))
      .where(eq(trend_reports.id, id));
    if (!row) throw new AppError('Trend report not found', 404);
    return row;
  }

  async update(id: string, input: Partial<CreateTrendInput> & { status?: string }) {
    await this.getById(id);
    const [row] = await db
      .update(trend_reports)
      .set({ ...(input as any), updated_at: new Date() })
      .where(eq(trend_reports.id, id))
      .returning();
    return row;
  }

  async expireTrend(id: string) {
    const [row] = await db
      .update(trend_reports)
      .set({ status: 'expired', updated_at: new Date() })
      .where(eq(trend_reports.id, id))
      .returning();
    if (!row) throw new AppError('Trend report not found', 404);
    return row;
  }

  async archiveTrend(id: string) {
    const [row] = await db
      .update(trend_reports)
      .set({ status: 'archived', updated_at: new Date() })
      .where(eq(trend_reports.id, id))
      .returning();
    if (!row) throw new AppError('Trend report not found', 404);
    return row;
  }

  async expireStale() {
    const [result] = await db
      .update(trend_reports)
      .set({ status: 'expired', updated_at: new Date() })
      .where(
        and(
          eq(trend_reports.status, 'active'),
          sql`${trend_reports.expires_at} IS NOT NULL AND ${trend_reports.expires_at} <= now()`,
        ),
      )
      .returning();
    return result;
  }

  async createRecommendation(trendId: string, contentId: string | null, artistId: string | null, suggestion: string, relevanceScore = 50) {
    const [row] = await db
      .insert(trend_content_recommendations)
      .values({
        trend_id: trendId,
        content_id: contentId,
        artist_id: artistId,
        suggestion,
        relevance_score: relevanceScore,
      })
      .returning();
    return row;
  }

  async getRecommendations(trendId: string) {
    return db
      .select()
      .from(trend_content_recommendations)
      .where(eq(trend_content_recommendations.trend_id, trendId))
      .orderBy(desc(trend_content_recommendations.relevance_score));
  }

  async getRecommendationsForArtist(artistId: string) {
    return db
      .select({
        rec: trend_content_recommendations,
        trend: trend_reports,
      })
      .from(trend_content_recommendations)
      .innerJoin(trend_reports, eq(trend_content_recommendations.trend_id, trend_reports.id))
      .where(
        and(
          eq(trend_content_recommendations.artist_id, artistId),
          eq(trend_reports.status, 'active'),
        ),
      )
      .orderBy(desc(trend_content_recommendations.relevance_score))
      .limit(20);
  }

  async markRecommendationActedOn(recId: string) {
    const [row] = await db
      .update(trend_content_recommendations)
      .set({ is_acted_on: true, acted_on_at: new Date() })
      .where(eq(trend_content_recommendations.id, recId))
      .returning();
    if (!row) throw new AppError('Recommendation not found', 404);
    return row;
  }

  async scoreTrendForArtist(trendId: string, artistGenres: string[], artistCountries: string[]) {
    const trend = await this.getById(trendId);
    const trendRegions = (trend.trend.regions as string[]) ?? [];

    const regionOverlap = trendRegions.filter((r) => artistCountries.includes(r)).length;
    const overlapScore = Math.min(100, Math.round((regionOverlap / Math.max(trendRegions.length, 1)) * 100));

    return {
      trend_id: trendId,
      trend_score: trend.trend.trend_score,
      artist_relevance_score: overlapScore,
      recommendation_priority: Math.round(
        (trend.trend.trend_score * 0.5) + (overlapScore * 0.5),
      ),
    };
  }
}

export const trendIntelligenceService = new TrendIntelligenceService();

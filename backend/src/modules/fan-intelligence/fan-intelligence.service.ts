import { eq, desc, count, avg, sql, gte, and } from 'drizzle-orm';
import { db } from '../../db';
import { fan_profiles, fan_events } from '../../db/schema';
import { AppError } from '../../middleware/errorHandler';

const EVENT_WEIGHTS: Record<string, number> = {
  purchased: 20,
  pre_saved: 12,
  joined_telegram: 10,
  shared: 8,
  commented: 5,
  streamed: 5,
  replied: 4,
  clicked_link: 2,
};

export const getFanSegments = async () => {
  const segmentExpr = sql<string>`
    CASE
      WHEN ${fan_profiles.superfan_score} >= 80 THEN 'superfan'
      WHEN ${fan_profiles.superfan_score} >= 50 THEN 'active'
      WHEN ${fan_profiles.superfan_score} >= 20 THEN 'passive'
      ELSE 'dormant'
    END
  `;

  return db
    .select({
      segment: segmentExpr,
      count: count(),
      avg_score: avg(fan_profiles.superfan_score),
    })
    .from(fan_profiles)
    .groupBy(segmentExpr)
    .orderBy(desc(count()));
};

export const getTopFans = async (limit = 20) => {
  return db
    .select()
    .from(fan_profiles)
    .orderBy(desc(fan_profiles.superfan_score))
    .limit(limit);
};

export const getEngagementBreakdown = async () => {
  return db
    .select({
      event_type: fan_events.event_type,
      count: count(),
    })
    .from(fan_events)
    .groupBy(fan_events.event_type)
    .orderBy(desc(count()));
};

export const getGeographicDistribution = async () => {
  return db
    .select({
      country: fan_profiles.country,
      count: count(),
    })
    .from(fan_profiles)
    .where(sql`${fan_profiles.country} IS NOT NULL`)
    .groupBy(fan_profiles.country)
    .orderBy(desc(count()))
    .limit(20);
};

export const getSourceBreakdown = async () => {
  return db
    .select({
      source: fan_profiles.source,
      count: count(),
    })
    .from(fan_profiles)
    .where(sql`${fan_profiles.source} IS NOT NULL`)
    .groupBy(fan_profiles.source)
    .orderBy(desc(count()));
};

export const getFanGrowth = async (days = 30) => {
  const since = new Date();
  since.setDate(since.getDate() - days);

  const [row] = await db
    .select({ count: count() })
    .from(fan_profiles)
    .where(gte(fan_profiles.created_at, since));

  return { new_fans: Number(row.count), period_days: days };
};

export const getFanTimeline = async (fanId: string) => {
  const [fan] = await db
    .select()
    .from(fan_profiles)
    .where(eq(fan_profiles.id, fanId))
    .limit(1);
  if (!fan) throw new AppError('Fan not found', 404);

  const events = await db
    .select()
    .from(fan_events)
    .where(eq(fan_events.fan_id, fanId))
    .orderBy(desc(fan_events.created_at))
    .limit(50);

  return { fan, events };
};

export const recalculateFanScore = async (fanId: string): Promise<number> => {
  const since = new Date();
  since.setDate(since.getDate() - 90);

  const events = await db
    .select({ event_type: fan_events.event_type })
    .from(fan_events)
    .where(and(eq(fan_events.fan_id, fanId), gte(fan_events.created_at, since)));

  const raw = events.reduce((acc, e) => acc + (EVENT_WEIGHTS[e.event_type] ?? 1), 0);
  const score = Math.min(raw, 100);

  const [updated] = await db
    .update(fan_profiles)
    .set({ superfan_score: score, updated_at: new Date() })
    .where(eq(fan_profiles.id, fanId))
    .returning();

  if (!updated) throw new AppError('Fan not found', 404);
  return score;
};

export const updateFanScore = async (fanId: string, score: number) => {
  const [updated] = await db
    .update(fan_profiles)
    .set({ superfan_score: score, updated_at: new Date() })
    .where(eq(fan_profiles.id, fanId))
    .returning();

  if (!updated) throw new AppError('Fan not found', 404);
  return updated;
};

export const getIntelligenceSummary = async () => {
  const [segments, topFans, engagement, geography, sources, growth] = await Promise.all([
    getFanSegments(),
    getTopFans(10),
    getEngagementBreakdown(),
    getGeographicDistribution(),
    getSourceBreakdown(),
    getFanGrowth(30),
  ]);

  return {
    segments,
    top_fans: topFans,
    engagement_breakdown: engagement,
    geographic_distribution: geography,
    source_breakdown: sources,
    growth_30d: growth,
  };
};

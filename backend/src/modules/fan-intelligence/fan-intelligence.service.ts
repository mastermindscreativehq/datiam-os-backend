import { eq, desc, count, avg, sql, gte, and } from 'drizzle-orm';
import { db } from '../../db';
import { fan_profiles, fan_events } from '../../db/schema';
import { AppError } from '../../middleware/errorHandler';
import { updateFanScores } from '../fans/fans.service';

const QUERY_TIMEOUT_MS = 2500;

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

async function timedQuery<T>(name: string, query: Promise<T>, fallback: T): Promise<T> {
  let timer: ReturnType<typeof setTimeout>;

  const timeout = new Promise<T>((resolve) => {
    timer = setTimeout(() => {
      console.log(`[FanIntelligence] query ${name} timed out`);
      resolve(fallback);
    }, QUERY_TIMEOUT_MS);
  });

  return Promise.race([
    query
      .then((result) => {
        clearTimeout(timer!);
        console.log(`[FanIntelligence] query ${name} succeeded`);
        return result;
      })
      .catch((err) => {
        clearTimeout(timer!);
        console.error(`[FanIntelligence] query ${name} failed:`, err instanceof Error ? err.message : err);
        return fallback;
      }),
    timeout,
  ]);
}

export const getFanSegments = async () => {
  const segmentExpr = sql<string>`
    CASE
      WHEN ${fan_profiles.superfan_score} >= 80 THEN 'superfan'
      WHEN ${fan_profiles.superfan_score} >= 50 THEN 'active'
      WHEN ${fan_profiles.superfan_score} >= 20 THEN 'passive'
      ELSE 'dormant'
    END
  `;

  return timedQuery(
    'segments',
    db
      .select({
        segment: segmentExpr,
        count: count(),
        avg_score: avg(fan_profiles.superfan_score),
      })
      .from(fan_profiles)
      .groupBy(segmentExpr)
      .orderBy(desc(count())),
    [],
  );
};

export const getTopFans = async (limit = 20) => {
  return timedQuery(
    'top-fans',
    db
      .select()
      .from(fan_profiles)
      .orderBy(desc(fan_profiles.superfan_score))
      .limit(limit),
    [],
  );
};

export const getEngagementBreakdown = async () => {
  return timedQuery(
    'engagement',
    db
      .select({
        event_type: fan_events.event_type,
        count: count(),
      })
      .from(fan_events)
      .groupBy(fan_events.event_type)
      .orderBy(desc(count())),
    [],
  );
};

export const getGeographicDistribution = async () => {
  return timedQuery(
    'geography',
    db
      .select({
        country: fan_profiles.country,
        count: count(),
      })
      .from(fan_profiles)
      .where(sql`${fan_profiles.country} IS NOT NULL`)
      .groupBy(fan_profiles.country)
      .orderBy(desc(count()))
      .limit(20),
    [],
  );
};

export const getSourceBreakdown = async () => {
  return timedQuery(
    'sources',
    db
      .select({
        source: fan_profiles.source,
        count: count(),
      })
      .from(fan_profiles)
      .where(sql`${fan_profiles.source} IS NOT NULL`)
      .groupBy(fan_profiles.source)
      .orderBy(desc(count())),
    [],
  );
};

export const getFanGrowth = async (days = 30) => {
  const since = new Date();
  since.setDate(since.getDate() - days);

  const result = await timedQuery(
    'growth',
    db
      .select({ count: count() })
      .from(fan_profiles)
      .where(gte(fan_profiles.created_at, since))
      .then((r) => Number(r[0].count)),
    0,
  );

  return { new_fans: result, period_days: days };
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

  await updateFanScores(fanId, { superfan_score: score });
  return score;
};

export const updateFanScore = async (fanId: string, score: number) => {
  return updateFanScores(fanId, { superfan_score: score });
};

export const getIntelligenceSummary = async () => {
  const start = Date.now();
  console.log('[FanIntelligence] summary started');

  try {
    const [segments, topFans, engagement, geography, sources, growth] = await Promise.all([
      getFanSegments(),
      getTopFans(10),
      getEngagementBreakdown(),
      getGeographicDistribution(),
      getSourceBreakdown(),
      getFanGrowth(30),
    ]);

    const totalFans = (segments as any[]).reduce((sum, s) => sum + Number(s.count ?? 0), 0);
    const activeFans = (segments as any[])
      .filter((s) => s.segment === 'superfan' || s.segment === 'active')
      .reduce((sum, s) => sum + Number(s.count ?? 0), 0);
    const avgScoreRaw = (segments as any[]).reduce((sum, s) => sum + Number(s.avg_score ?? 0) * Number(s.count ?? 0), 0);
    const avgScore = totalFans > 0 ? Math.round(avgScoreRaw / totalFans) : 0;

    const result = {
      total_fans: totalFans,
      active_fans: activeFans,
      avg_score: avgScore,
      segments,
      top_fans: topFans,
      engagement_breakdown: engagement,
      geographic_distribution: geography,
      source_breakdown: sources,
      growth_30d: growth,
    };

    console.log(`[FanIntelligence] summary returned in ${Date.now() - start}ms`);
    return result;
  } catch (err) {
    console.error('[FanIntelligence] summary unhandled error:', err instanceof Error ? err.message : err);
    console.log(`[FanIntelligence] summary returned in ${Date.now() - start}ms`);
    return {
      total_fans: 0,
      active_fans: 0,
      avg_score: 0,
      segments: [],
      top_fans: [],
      engagement_breakdown: [],
      geographic_distribution: [],
      source_breakdown: [],
      growth_30d: { new_fans: 0, period_days: 30 },
    };
  }
};

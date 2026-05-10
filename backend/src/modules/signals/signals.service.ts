import { eq, count, desc, sql, gte, and } from 'drizzle-orm';
import { db } from '../../db';
import { content_ideas } from '../../db/schema';

const FUNNEL_ORDER = ['idea', 'scripted', 'recorded', 'edited', 'scheduled', 'posted'] as const;

export const getPipelineFunnel = async () => {
  const rows = await db
    .select({ status: content_ideas.status, count: count() })
    .from(content_ideas)
    .groupBy(content_ideas.status);

  const byStatus: Record<string, number> = {};
  for (const r of rows) byStatus[r.status] = Number(r.count);

  return FUNNEL_ORDER.map((stage) => ({ stage, count: byStatus[stage] ?? 0 }));
};

export const getContentByPlatform = async () => {
  return db
    .select({ platform: content_ideas.platform, count: count() })
    .from(content_ideas)
    .where(sql`${content_ideas.platform} IS NOT NULL`)
    .groupBy(content_ideas.platform)
    .orderBy(desc(count()));
};

export const getContentByType = async () => {
  return db
    .select({ content_type: content_ideas.content_type, count: count() })
    .from(content_ideas)
    .groupBy(content_ideas.content_type)
    .orderBy(desc(count()));
};

export const getPublishingVelocity = async () => {
  const now = new Date();
  const ago7 = new Date(now);
  ago7.setDate(ago7.getDate() - 7);
  const ago30 = new Date(now);
  ago30.setDate(ago30.getDate() - 30);

  const [w, m] = await Promise.all([
    db
      .select({ count: count() })
      .from(content_ideas)
      .where(and(eq(content_ideas.status, 'posted'), gte(content_ideas.created_at, ago7)))
      .then((r) => Number(r[0].count)),
    db
      .select({ count: count() })
      .from(content_ideas)
      .where(and(eq(content_ideas.status, 'posted'), gte(content_ideas.created_at, ago30)))
      .then((r) => Number(r[0].count)),
  ]);

  return {
    posts_last_7d: w,
    posts_last_30d: m,
    avg_per_day_30d: +(m / 30).toFixed(2),
  };
};

export const getScheduledContent = async () => {
  return db
    .select()
    .from(content_ideas)
    .where(eq(content_ideas.status, 'scheduled'))
    .orderBy(content_ideas.scheduled_date)
    .limit(20);
};

export const getSignalsSummary = async () => {
  const [funnel, byPlatform, byType, velocity, scheduled] = await Promise.all([
    getPipelineFunnel(),
    getContentByPlatform(),
    getContentByType(),
    getPublishingVelocity(),
    getScheduledContent(),
  ]);

  const total = funnel.reduce((s, f) => s + f.count, 0);
  const postedCount = funnel.find((f) => f.stage === 'posted')?.count ?? 0;
  const conversionRate = total > 0 ? +((postedCount / total) * 100).toFixed(1) : 0;

  return {
    total_ideas: total,
    pipeline_funnel: funnel,
    conversion_rate_percent: conversionRate,
    by_platform: byPlatform,
    by_type: byType,
    velocity,
    scheduled_content: scheduled,
  };
};

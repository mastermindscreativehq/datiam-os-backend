import { eq, ne, inArray, count, sum, avg, desc, gte, sql } from 'drizzle-orm';
import { db } from '../../db';
import {
  songs,
  fan_profiles,
  royalty_sources,
  releases,
  release_tasks,
  sync_pitches,
  fan_events,
  content_ideas,
  automation_runs,
  scheduled_jobs,
  ai_recommendations,
} from '../../db/schema';

// Returns fallback if the query throws, so one bad table never crashes the whole endpoint.
async function safeQuery<T>(query: Promise<T>, fallback: T): Promise<T> {
  try {
    return await query;
  } catch (err) {
    console.error('[dashboard:query]', err instanceof Error ? err.message : err);
    return fallback;
  }
}

export const getDashboardOverview = async () => {
  const [
    totalSongs,
    releasedSongs,
    syncReadySongs,
    totalFans,
    superfans,
    avgSuperfan,
    totalRoyalties,
    totalReleases,
    liveReleases,
    pendingTasks,
    blockedTasks,
    activePitches,
    acceptedPitches,
    totalContent,
  ] = await Promise.all([
    safeQuery(db.select({ count: count() }).from(songs).then((r) => Number(r[0].count)), 0),
    safeQuery(
      db.select({ count: count() }).from(songs).where(eq(songs.release_status, 'released')).then((r) => Number(r[0].count)),
      0,
    ),
    safeQuery(
      db.select({ count: count() }).from(songs).where(eq(songs.sync_ready, true)).then((r) => Number(r[0].count)),
      0,
    ),
    safeQuery(db.select({ count: count() }).from(fan_profiles).then((r) => Number(r[0].count)), 0),
    safeQuery(
      db.select({ count: count() }).from(fan_profiles).where(gte(fan_profiles.superfan_score, 80)).then((r) => Number(r[0].count)),
      0,
    ),
    safeQuery(
      db.select({ avg: avg(fan_profiles.superfan_score) }).from(fan_profiles).then((r) => (r[0].avg ? parseFloat(r[0].avg) : 0)),
      0,
    ),
    safeQuery(
      db.select({ total: sum(royalty_sources.amount) }).from(royalty_sources).then((r) => (r[0].total ? parseFloat(r[0].total) : 0)),
      0,
    ),
    safeQuery(db.select({ count: count() }).from(releases).then((r) => Number(r[0].count)), 0),
    safeQuery(
      db.select({ count: count() }).from(releases).where(eq(releases.status, 'live')).then((r) => Number(r[0].count)),
      0,
    ),
    safeQuery(
      db.select({ count: count() }).from(release_tasks).where(ne(release_tasks.status, 'done')).then((r) => Number(r[0].count)),
      0,
    ),
    safeQuery(
      db.select({ count: count() }).from(release_tasks).where(eq(release_tasks.status, 'blocked')).then((r) => Number(r[0].count)),
      0,
    ),
    safeQuery(
      db
        .select({ count: count() })
        .from(sync_pitches)
        .where(inArray(sync_pitches.status, ['prospect', 'pitched', 'follow_up']))
        .then((r) => Number(r[0].count)),
      0,
    ),
    safeQuery(
      db.select({ count: count() }).from(sync_pitches).where(eq(sync_pitches.status, 'accepted')).then((r) => Number(r[0].count)),
      0,
    ),
    safeQuery(db.select({ count: count() }).from(content_ideas).then((r) => Number(r[0].count)), 0),
  ]);

  const [
    revenueByType,
    contentByStatus,
    upcomingReleases,
    recentFanEvents,
    latestAutomationRuns,
    activeScheduledJobs,
    recentAiRecommendations,
  ] = await Promise.all([
    safeQuery(
      db
        .select({ royalty_type: royalty_sources.royalty_type, total: sum(royalty_sources.amount) })
        .from(royalty_sources)
        .groupBy(royalty_sources.royalty_type),
      [],
    ),
    safeQuery(
      db.select({ status: content_ideas.status, count: count() }).from(content_ideas).groupBy(content_ideas.status),
      [],
    ),
    safeQuery(
      db.select().from(releases).where(ne(releases.status, 'live')).orderBy(releases.release_date).limit(5),
      [],
    ),
    safeQuery(
      db.select().from(fan_events).orderBy(desc(fan_events.created_at)).limit(10),
      [],
    ),
    safeQuery(
      db.select().from(automation_runs).orderBy(desc(automation_runs.created_at)).limit(5),
      [],
    ),
    safeQuery(
      db.select().from(scheduled_jobs).where(eq(scheduled_jobs.status, 'active')).orderBy(desc(scheduled_jobs.created_at)).limit(10),
      [],
    ),
    safeQuery(
      db.select().from(ai_recommendations).where(eq(ai_recommendations.dismissed, false)).orderBy(desc(ai_recommendations.created_at)).limit(5),
      [],
    ),
  ]);

  const revenueMap: Record<string, number> = {};
  for (const row of revenueByType) {
    revenueMap[row.royalty_type] = row.total ? parseFloat(row.total) : 0;
  }

  const contentStatusMap: Record<string, number> = {};
  for (const row of contentByStatus) {
    contentStatusMap[row.status] = Number(row.count);
  }

  const totalPitches = activePitches + acceptedPitches;
  const winRatePercent =
    totalPitches > 0 ? Math.round((acceptedPitches / totalPitches) * 100) : 0;

  return {
    songs: {
      total: totalSongs,
      released: releasedSongs,
      sync_ready: syncReadySongs,
      draft: totalSongs - releasedSongs,
    },
    fans: {
      total: totalFans,
      superfans,
      average_score: avgSuperfan,
    },
    releases: {
      total: totalReleases,
      live: liveReleases,
      in_progress: totalReleases - liveReleases,
      upcoming: upcomingReleases,
    },
    tasks: {
      pending: pendingTasks,
      blocked: blockedTasks,
    },
    sync_pitches: {
      active: activePitches,
      accepted: acceptedPitches,
      win_rate_percent: winRatePercent,
    },
    revenue_summary: {
      total_tracked: totalRoyalties,
      by_type: revenueMap,
    },
    content_ideas: {
      total: totalContent,
      by_status: contentStatusMap,
    },
    recent_fan_events: recentFanEvents,
    latest_automation_runs: latestAutomationRuns,
    active_scheduled_jobs: activeScheduledJobs,
    recent_ai_recommendations: recentAiRecommendations,
  };
};

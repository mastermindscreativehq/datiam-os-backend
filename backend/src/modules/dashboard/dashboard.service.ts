import { eq, ne, inArray, count, sum, avg, desc, gte } from 'drizzle-orm';
import { db } from '../../db';
import {
  songs,
  fan_profiles,
  royalty_sources,
  releases,
  release_tasks,
  sync_pitches,
  automation_runs,
  ai_recommendations,
} from '../../db/schema';

const QUERY_TIMEOUT_MS = 2500;

const SAFE_DEFAULTS = {
  fans:             { total: 0, active: 0, growth_rate: 0, engagement_avg: 0 },
  songs:            { total: 0, released: 0, drafts: 0 },
  revenue_summary:  { total_tracked: 0, monthly: 0, currency: 'USD' },
  sync_pitches:     { active: 0, pending: 0, won: 0, win_rate: 0 },
  releases:         { live: 0, upcoming: 0 },
  tasks:            { pending: 0, completed: 0 },
  automation:       { runs: 0, successful: 0, failed: 0 },
  ai_recommendations: [] as any[],
};

async function timedQuery<T>(name: string, query: Promise<T>, fallback: T): Promise<T> {
  let timer: ReturnType<typeof setTimeout>;

  const timeout = new Promise<T>((resolve) => {
    timer = setTimeout(() => {
      console.log(`[Dashboard] query ${name} timed out`);
      resolve(fallback);
    }, QUERY_TIMEOUT_MS);
  });

  return Promise.race([
    query
      .then((result) => {
        clearTimeout(timer!);
        console.log(`[Dashboard] query ${name} succeeded`);
        return result;
      })
      .catch((err) => {
        clearTimeout(timer!);
        console.error(`[Dashboard] query ${name} failed:`, err instanceof Error ? err.message : err);
        return fallback;
      }),
    timeout,
  ]);
}

export const getDashboardOverview = async () => {
  const start = Date.now();
  console.log('[Dashboard] overview started');

  try {
    const [
      fanTotal,
      fanActive,
      fanEngagementAvg,
      songTotal,
      songReleased,
      revTotal,
      pitchActive,
      pitchPending,
      pitchWon,
      releaseLive,
      releaseUpcoming,
      taskPending,
      taskCompleted,
      autoTotal,
      autoSuccessful,
      autoFailed,
      aiRecs,
    ] = await Promise.all([
      timedQuery('fans.total',
        db.select({ count: count() }).from(fan_profiles).then((r) => Number(r[0].count)),
        0),
      timedQuery('fans.active',
        db.select({ count: count() }).from(fan_profiles).where(gte(fan_profiles.superfan_score, 1)).then((r) => Number(r[0].count)),
        0),
      timedQuery('fans.engagement_avg',
        db.select({ avg: avg(fan_profiles.superfan_score) }).from(fan_profiles).then((r) => (r[0].avg ? Math.round(parseFloat(r[0].avg)) : 0)),
        0),
      timedQuery('songs.total',
        db.select({ count: count() }).from(songs).then((r) => Number(r[0].count)),
        0),
      timedQuery('songs.released',
        db.select({ count: count() }).from(songs).where(eq(songs.release_status, 'released')).then((r) => Number(r[0].count)),
        0),
      timedQuery('revenue.total',
        db.select({ total: sum(royalty_sources.amount) }).from(royalty_sources).then((r) => (r[0].total ? parseFloat(r[0].total) : 0)),
        0),
      timedQuery('pitches.active',
        db.select({ count: count() }).from(sync_pitches).where(inArray(sync_pitches.status, ['pitched', 'follow_up'])).then((r) => Number(r[0].count)),
        0),
      timedQuery('pitches.pending',
        db.select({ count: count() }).from(sync_pitches).where(eq(sync_pitches.status, 'prospect')).then((r) => Number(r[0].count)),
        0),
      timedQuery('pitches.won',
        db.select({ count: count() }).from(sync_pitches).where(eq(sync_pitches.status, 'accepted')).then((r) => Number(r[0].count)),
        0),
      timedQuery('releases.live',
        db.select({ count: count() }).from(releases).where(eq(releases.status, 'live')).then((r) => Number(r[0].count)),
        0),
      timedQuery('releases.upcoming',
        db.select({ count: count() }).from(releases).where(ne(releases.status, 'live')).then((r) => Number(r[0].count)),
        0),
      timedQuery('tasks.pending',
        db.select({ count: count() }).from(release_tasks).where(ne(release_tasks.status, 'done')).then((r) => Number(r[0].count)),
        0),
      timedQuery('tasks.completed',
        db.select({ count: count() }).from(release_tasks).where(eq(release_tasks.status, 'done')).then((r) => Number(r[0].count)),
        0),
      timedQuery('automation.total',
        db.select({ count: count() }).from(automation_runs).then((r) => Number(r[0].count)),
        0),
      timedQuery('automation.successful',
        db.select({ count: count() }).from(automation_runs).where(eq(automation_runs.status, 'success')).then((r) => Number(r[0].count)),
        0),
      timedQuery('automation.failed',
        db.select({ count: count() }).from(automation_runs).where(eq(automation_runs.status, 'failed')).then((r) => Number(r[0].count)),
        0),
      timedQuery('ai_recommendations',
        db.select().from(ai_recommendations).where(eq(ai_recommendations.dismissed, false)).orderBy(desc(ai_recommendations.created_at)).limit(5),
        []),
    ]);

    const totalPitches = pitchActive + pitchPending + pitchWon;
    const winRate = totalPitches > 0 ? Math.round((pitchWon / totalPitches) * 100) : 0;

    const result = {
      fans: {
        total:          fanTotal,
        active:         fanActive,
        growth_rate:    0,
        engagement_avg: fanEngagementAvg,
      },
      songs: {
        total:    songTotal,
        released: songReleased,
        drafts:   songTotal - songReleased,
      },
      revenue_summary: {
        total_tracked: revTotal,
        monthly:       0,
        currency:      'USD',
      },
      sync_pitches: {
        active:   pitchActive,
        pending:  pitchPending,
        won:      pitchWon,
        win_rate: winRate,
      },
      releases: {
        live:     releaseLive,
        upcoming: releaseUpcoming,
      },
      tasks: {
        pending:   taskPending,
        completed: taskCompleted,
      },
      automation: {
        runs:       autoTotal,
        successful: autoSuccessful,
        failed:     autoFailed,
      },
      ai_recommendations: aiRecs,
    };

    console.log(`[Dashboard] overview returned in ${Date.now() - start}ms`);
    return result;
  } catch (err) {
    console.error('[Dashboard] overview unhandled error:', err instanceof Error ? err.message : err);
    console.log(`[Dashboard] overview returned in ${Date.now() - start}ms`);
    return SAFE_DEFAULTS;
  }
};

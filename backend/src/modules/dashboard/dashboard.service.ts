import { eq, count, sum, avg, desc, sql } from 'drizzle-orm';
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

// Per-query safety net. Total response time is ~max(query times) since all 7 run concurrently.
// Was tightened to 800ms in 33d9946 on the assumption that batching 17 queries into 7 would make
// each proportionally faster — live testing against production Supabase shows individual batched
// queries routinely take 1.5-2s+ under completely normal (non-degraded) conditions, so 800ms was
// firing constantly and silently discarding real results in favor of hardcoded zero defaults.
const QUERY_TIMEOUT_MS = 5_000;

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
  const t0 = Date.now();
  let timer: ReturnType<typeof setTimeout>;

  const timeout = new Promise<T>((resolve) => {
    timer = setTimeout(() => {
      console.warn(`[Dashboard] ⏱ ${name} timed out after ${QUERY_TIMEOUT_MS}ms`);
      resolve(fallback);
    }, QUERY_TIMEOUT_MS);
  });

  return Promise.race([
    query
      .then((result) => {
        clearTimeout(timer!);
        console.log(`[Dashboard] ${name}: ${Date.now() - t0}ms`);
        return result;
      })
      .catch((err) => {
        clearTimeout(timer!);
        console.error(`[Dashboard] ${name} failed (${Date.now() - t0}ms):`, err instanceof Error ? err.message : err);
        return fallback;
      }),
    timeout,
  ]);
}

const n = (v: unknown): number => Number(v ?? 0);

export const getDashboardOverview = async () => {
  const start = Date.now();
  console.log('[Dashboard] overview started');

  try {
    // 17 queries → 7 queries. Each batched query uses COUNT(CASE WHEN ...) to collect
    // multiple metrics in a single table scan, eliminating redundant round trips.
    const [fanRow, songRow, revRow, pitchRow, releaseRow, taskRow, autoRow, aiRecs] = await Promise.all([

      // fan_profiles: was 3 queries (total, active, avg) → 1
      timedQuery('fans',
        db.select({
          total:          count(),
          active:         sql<string>`COUNT(CASE WHEN ${fan_profiles.superfan_score} >= 1 THEN 1 END)`,
          engagement_avg: avg(fan_profiles.superfan_score),
        }).from(fan_profiles).then((r) => r[0]),
        { total: 0, active: '0', engagement_avg: null } as any),

      // songs: was 2 queries (total, released) → 1
      timedQuery('songs',
        db.select({
          total:    count(),
          released: sql<string>`COUNT(CASE WHEN ${songs.release_status} = 'released' THEN 1 END)`,
        }).from(songs).then((r) => r[0]),
        { total: 0, released: '0' } as any),

      // royalty_sources: unchanged (single aggregation)
      timedQuery('revenue',
        db.select({ total: sum(royalty_sources.amount) }).from(royalty_sources).then((r) => r[0]),
        { total: null }),

      // sync_pitches: was 3 queries (active, pending, won) → 1
      timedQuery('sync_pitches',
        db.select({
          active:  sql<string>`COUNT(CASE WHEN ${sync_pitches.status} IN ('pitched', 'follow_up') THEN 1 END)`,
          pending: sql<string>`COUNT(CASE WHEN ${sync_pitches.status} = 'prospect' THEN 1 END)`,
          won:     sql<string>`COUNT(CASE WHEN ${sync_pitches.status} = 'accepted' THEN 1 END)`,
        }).from(sync_pitches).then((r) => r[0]),
        { active: '0', pending: '0', won: '0' } as any),

      // releases: was 2 queries (live, upcoming) → 1
      timedQuery('releases',
        db.select({
          live:     sql<string>`COUNT(CASE WHEN ${releases.status} = 'live' THEN 1 END)`,
          upcoming: sql<string>`COUNT(CASE WHEN ${releases.status} != 'live' THEN 1 END)`,
        }).from(releases).then((r) => r[0]),
        { live: '0', upcoming: '0' } as any),

      // release_tasks: was 2 queries (pending, completed) → 1
      timedQuery('tasks',
        db.select({
          pending:   sql<string>`COUNT(CASE WHEN ${release_tasks.status} != 'done' THEN 1 END)`,
          completed: sql<string>`COUNT(CASE WHEN ${release_tasks.status} = 'done' THEN 1 END)`,
        }).from(release_tasks).then((r) => r[0]),
        { pending: '0', completed: '0' } as any),

      // automation_runs: was 3 queries (total, successful, failed) → 1
      timedQuery('automation',
        db.select({
          total:      count(),
          successful: sql<string>`COUNT(CASE WHEN ${automation_runs.status} = 'success' THEN 1 END)`,
          failed:     sql<string>`COUNT(CASE WHEN ${automation_runs.status} = 'failed' THEN 1 END)`,
        }).from(automation_runs).then((r) => r[0]),
        { total: 0, successful: '0', failed: '0' } as any),

      // ai_recommendations: unchanged
      timedQuery('ai_recommendations',
        db.select().from(ai_recommendations)
          .where(eq(ai_recommendations.dismissed, false))
          .orderBy(desc(ai_recommendations.created_at))
          .limit(5),
        []),
    ]);

    const pitchActive  = n(pitchRow?.active);
    const pitchPending = n(pitchRow?.pending);
    const pitchWon     = n(pitchRow?.won);
    const totalPitches = pitchActive + pitchPending + pitchWon;
    const winRate      = totalPitches > 0 ? Math.round((pitchWon / totalPitches) * 100) : 0;

    console.log(`[Dashboard] overview completed in ${Date.now() - start}ms`);

    return {
      fans: {
        total:          n(fanRow?.total),
        active:         n(fanRow?.active),
        growth_rate:    0,
        engagement_avg: fanRow?.engagement_avg ? Math.round(parseFloat(fanRow.engagement_avg)) : 0,
      },
      songs: {
        total:    n(songRow?.total),
        released: n(songRow?.released),
        drafts:   n(songRow?.total) - n(songRow?.released),
      },
      revenue_summary: {
        total_tracked: revRow?.total ? parseFloat(revRow.total) : 0,
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
        live:     n(releaseRow?.live),
        upcoming: n(releaseRow?.upcoming),
      },
      tasks: {
        pending:   n(taskRow?.pending),
        completed: n(taskRow?.completed),
      },
      automation: {
        runs:       n(autoRow?.total),
        successful: n(autoRow?.successful),
        failed:     n(autoRow?.failed),
      },
      ai_recommendations: aiRecs ?? [],
    };
  } catch (err) {
    console.error('[Dashboard] overview unhandled error:', err instanceof Error ? err.message : err);
    console.log(`[Dashboard] overview returned in ${Date.now() - start}ms`);
    return SAFE_DEFAULTS;
  }
};

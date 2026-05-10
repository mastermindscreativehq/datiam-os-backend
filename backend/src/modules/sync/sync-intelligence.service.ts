import { eq, count, desc, sql, inArray } from 'drizzle-orm';
import { db } from '../../db';
import { sync_pitches } from '../../db/schema';

export const getSyncPipelineAnalytics = async () => {
  const today = new Date().toISOString().split('T')[0];

  const [statusBreakdown, opportunityBreakdown, totalRow, acceptedRow, followUpsDue, recentPitches] =
    await Promise.all([
      db
        .select({ status: sync_pitches.status, count: count() })
        .from(sync_pitches)
        .groupBy(sync_pitches.status),
      db
        .select({ opportunity_type: sync_pitches.opportunity_type, count: count() })
        .from(sync_pitches)
        .groupBy(sync_pitches.opportunity_type)
        .orderBy(desc(count())),
      db.select({ count: count() }).from(sync_pitches),
      db
        .select({ count: count() })
        .from(sync_pitches)
        .where(eq(sync_pitches.status, 'accepted')),
      db
        .select()
        .from(sync_pitches)
        .where(
          sql`${sync_pitches.follow_up_date} IS NOT NULL
            AND ${sync_pitches.follow_up_date} <= ${today}
            AND ${sync_pitches.status} NOT IN ('accepted', 'rejected')`,
        )
        .orderBy(sync_pitches.follow_up_date)
        .limit(10),
      db
        .select()
        .from(sync_pitches)
        .orderBy(desc(sync_pitches.created_at))
        .limit(10),
    ]);

  const total = Number(totalRow[0].count);
  const accepted = Number(acceptedRow[0].count);
  const win_rate_percent = total > 0 ? Math.round((accepted / total) * 100) : 0;

  return {
    total_pitches: total,
    win_rate_percent,
    status_breakdown: statusBreakdown,
    opportunity_breakdown: opportunityBreakdown,
    follow_ups_due: followUpsDue,
    recent_pitches: recentPitches,
  };
};

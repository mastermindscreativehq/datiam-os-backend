import { eq, desc, and, sql, sum, count } from 'drizzle-orm';
import { db } from '../../db';
import { fan_profiles, fan_events } from '../../db/schema';
import { AppError } from '../../middleware/errorHandler';

const AMBASSADOR_WEIGHTS = {
  streamed: 1,
  pre_saved: 2,
  shared: 3,
  commented: 1,
  purchased: 5,
  link_referral: 4,
  playlist_saved: 3,
  content_viewed: 0.5,
  merch_purchased: 6,
} as const;

export class FanIntelligenceExtensionService {
  async getAmbassadorCandidates(minScore = 10, limit = 50) {
    return db
      .select()
      .from(fan_profiles)
      .where(sql`${(fan_profiles as any).ambassador_score} >= ${minScore}`)
      .orderBy(desc((fan_profiles as any).ambassador_score))
      .limit(limit);
  }

  async getTopAmbassadors(limit = 20) {
    return db
      .select()
      .from(fan_profiles)
      .where(sql`${(fan_profiles as any).ambassador_score} > 0`)
      .orderBy(desc((fan_profiles as any).ambassador_score))
      .limit(limit);
  }

  async recalculateAmbassadorScore(fanId: string) {
    const events = await db
      .select({ event_type: fan_events.event_type })
      .from(fan_events)
      .where(eq(fan_events.fan_id, fanId));

    let score = 0;
    for (const { event_type } of events) {
      score += (AMBASSADOR_WEIGHTS as any)[event_type] ?? 0;
    }

    const ambassadorScore = Math.min(100, score);
    const [row] = await db
      .update(fan_profiles)
      .set({ ambassador_score: ambassadorScore.toString() } as any)
      .where(eq(fan_profiles.id, fanId))
      .returning();
    return row;
  }

  async batchRecalculateAmbassadorScores(limit = 500) {
    const fans = await db
      .select({ id: fan_profiles.id })
      .from(fan_profiles)
      .limit(limit);

    const updated = [];
    for (const fan of fans) {
      const row = await this.recalculateAmbassadorScore(fan.id);
      if (row) updated.push(row);
    }
    return { updated: updated.length };
  }

  async getReferralActivity(limit = 50) {
    return db
      .select({
        fan: fan_profiles,
        referral_count: count(fan_events.id),
      })
      .from(fan_events)
      .innerJoin(fan_profiles, eq(fan_events.fan_id, fan_profiles.id))
      .where(eq(fan_events.event_type, 'link_referral' as any))
      .groupBy(fan_profiles.id)
      .orderBy(desc(count(fan_events.id)))
      .limit(limit);
  }

  async getFanFavoriteContent(fanId: string) {
    return db
      .select({
        event_type: fan_events.event_type,
        count: count(fan_events.id),
      })
      .from(fan_events)
      .where(
        and(
          eq(fan_events.fan_id, fanId),
          sql`${fan_events.event_type} IN ('streamed', 'pre_saved', 'content_viewed', 'playlist_saved')`,
        ),
      )
      .groupBy(fan_events.event_type)
      .orderBy(desc(count(fan_events.id)));
  }

  async updateDspListenerCount(fanId: string, count: number) {
    const [row] = await db
      .update(fan_profiles)
      .set({ dsp_listener_count: count } as any)
      .where(eq(fan_profiles.id, fanId))
      .returning();
    if (!row) throw new AppError('Fan profile not found', 404);
    return row;
  }

  async updateCommunityScore(fanId: string) {
    const [result] = await db
      .select({ total: count(fan_events.id) })
      .from(fan_events)
      .where(
        and(
          eq(fan_events.fan_id, fanId),
          sql`${fan_events.event_type} IN ('commented', 'shared', 'link_referral')`,
        ),
      );

    const communityScore = Math.min(100, (result?.total ?? 0) * 3);
    const [row] = await db
      .update(fan_profiles)
      .set({ community_score: communityScore.toString() } as any)
      .where(eq(fan_profiles.id, fanId))
      .returning();
    return row;
  }

  async getCommunityMetrics() {
    const [result] = await db
      .select({
        total_fans: count(fan_profiles.id),
        avg_ambassador_score: sql<number>`avg(${(fan_profiles as any).ambassador_score})`,
        total_referrals: sum((fan_profiles as any).referral_count),
        total_dsp_listeners: sum((fan_profiles as any).dsp_listener_count),
      })
      .from(fan_profiles);
    return result;
  }

  async incrementReferralCount(fanId: string) {
    const [row] = await db
      .update(fan_profiles)
      .set({
        referral_count: sql`${(fan_profiles as any).referral_count} + 1`,
      } as any)
      .where(eq(fan_profiles.id, fanId))
      .returning();
    return row;
  }
}

export const fanIntelligenceExtensionService = new FanIntelligenceExtensionService();

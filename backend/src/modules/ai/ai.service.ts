import { eq, desc, count, avg, sum, sql } from 'drizzle-orm';
import { db } from '../../db';
import {
  ai_recommendations,
  songs,
  releases,
  fan_profiles,
  fan_events,
  content_ideas,
  sync_pitches,
} from '../../db/schema';
import { AppError } from '../../middleware/errorHandler';
import type { GenerateRecommendationInput } from './ai.schema';

// ---- Context builders ----

async function buildSongContext(entityId?: string) {
  if (entityId) {
    const [song] = await db.select().from(songs).where(eq(songs.id, entityId)).limit(1);
    if (!song) throw new AppError('Song not found', 404);
    return `Song: "${song.title}", Genre: ${song.genre ?? 'unknown'}, Mood: ${song.mood ?? 'unknown'}, BPM: ${song.bpm ?? '?'}, Status: ${song.release_status}, Sync Ready: ${song.sync_ready}`;
  }
  const [totalRow] = await db.select({ count: count() }).from(songs);
  const [syncRow] = await db
    .select({ count: count() })
    .from(songs)
    .where(sql`${songs.sync_ready} = true`);
  return `Catalog: ${totalRow.count} songs total, ${syncRow.count} sync-ready.`;
}

async function buildReleaseContext(entityId?: string) {
  if (entityId) {
    const [r] = await db.select().from(releases).where(eq(releases.id, entityId)).limit(1);
    if (!r) throw new AppError('Release not found', 404);
    return `Release: "${r.release_title}", Type: ${r.release_type}, Status: ${r.status}, Date: ${r.release_date ?? 'TBD'}, Distributor: ${r.distributor ?? 'none'}`;
  }
  const statusRows = await db
    .select({ status: releases.status, count: count() })
    .from(releases)
    .groupBy(releases.status);
  const summary = statusRows.map((r) => `${r.status}: ${r.count}`).join(', ');
  return `Releases: ${summary}`;
}

async function buildFanContext() {
  const [[totalRow], [sfRow], [avgRow]] = await Promise.all([
    db.select({ count: count() }).from(fan_profiles),
    db
      .select({ count: count() })
      .from(fan_profiles)
      .where(sql`${fan_profiles.superfan_score} >= 80`),
    db.select({ avg: avg(fan_profiles.superfan_score) }).from(fan_profiles),
  ]);
  const avgScore = avgRow.avg ? parseFloat(avgRow.avg).toFixed(1) : '0';
  return `Fans: ${totalRow.count} total, ${sfRow.count} superfans (score ≥80), avg score ${avgScore}.`;
}

async function buildContentContext() {
  const rows = await db
    .select({ status: content_ideas.status, count: count() })
    .from(content_ideas)
    .groupBy(content_ideas.status);
  const summary = rows.map((r) => `${r.status}: ${r.count}`).join(', ');
  return `Content ideas: ${summary || 'none yet'}.`;
}

async function buildSyncContext() {
  const [totalRow] = await db.select({ count: count() }).from(sync_pitches);
  const [accRow] = await db
    .select({ count: count() })
    .from(sync_pitches)
    .where(eq(sync_pitches.status, 'accepted'));
  const total = Number(totalRow.count);
  const accepted = Number(accRow.count);
  const wr = total > 0 ? Math.round((accepted / total) * 100) : 0;
  return `Sync pitches: ${total} total, ${accepted} accepted (${wr}% win rate).`;
}

// ---- Rule-based fallback ----

function ruleBasedRecommendation(
  contextType: string,
  context: string,
): { title: string; body: string; action_items: string[] } {
  const tips: Record<string, { title: string; body: string; action_items: string[] }> = {
    song: {
      title: 'Improve Sync Readiness',
      body: 'Review your catalog and mark sync-ready tracks. Sync placements in TV, film, and ads generate significant revenue. Ensure you have clean/instrumental stems uploaded for every sync-ready song.',
      action_items: [
        'Upload clean and instrumental versions for all sync-ready songs',
        'Add mood and BPM metadata to all songs missing it',
        'Create a sync pitch for your top 3 most sync-ready tracks',
        'Register all songs with a PRO (performing rights organization)',
      ],
    },
    release: {
      title: 'Optimize Your Release Pipeline',
      body: 'Consistent releases keep you visible across streaming platforms and build algorithmic momentum. Plan at least 60 days ahead and complete all checklist tasks before submission.',
      action_items: [
        'Submit releases 3-4 weeks before target release date',
        'Ensure all distribution platforms are configured before submission',
        'Create pre-save campaigns for upcoming releases',
        'Schedule social content for release week',
      ],
    },
    fan_engagement: {
      title: 'Deepen Fan Engagement',
      body: 'Your superfans (score ≥80) are your most valuable asset. Focus on activating them with exclusive content, early access, and direct outreach to convert passive fans to superfans.',
      action_items: [
        'Reach out personally to your top 10 fans with a thank-you message',
        'Create exclusive content for fans in your Telegram community',
        'Run a fan appreciation campaign ahead of your next release',
        'Identify dormant fans (score < 20) and re-engage with targeted messaging',
      ],
    },
    content: {
      title: 'Accelerate Content Production',
      body: 'Consistent content is critical for algorithmic growth on TikTok, Instagram Reels, and YouTube Shorts. Aim for 3-5 posts per week across platforms.',
      action_items: [
        'Script 5 short-form videos this week using your existing catalog',
        'Create content templates for consistent posting schedules',
        'Batch-record multiple short videos in a single session',
        'Analyze which content types generate the most fan engagement',
      ],
    },
    sync: {
      title: 'Scale Your Sync Pipeline',
      body: 'Sync licensing is one of the most reliable income streams for independent artists. A higher volume of quality pitches directly improves win rate over time.',
      action_items: [
        'Identify 5 new music supervisors to add to your pitch list',
        'Follow up on all pitches older than 3 weeks with no response',
        'Upload high-quality WAV stems for all sync-targeted songs',
        'Research 3 upcoming film/TV productions that match your sound',
      ],
    },
  };

  return tips[contextType] ?? tips['song'];
}

// ---- Anthropic API call ----

async function callAnthropic(prompt: string): Promise<{ title: string; body: string; action_items: string[] }> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error('No API key');

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 800,
      messages: [{ role: 'user', content: prompt }],
    }),
  });

  if (!response.ok) throw new Error(`Anthropic API error: ${response.status}`);

  const data = (await response.json()) as { content: Array<{ text: string }> };
  const raw = data.content?.[0]?.text ?? '';

  // Extract JSON from the response
  const match = raw.match(/\{[\s\S]*\}/);
  if (!match) throw new Error('Failed to parse AI response');

  return JSON.parse(match[0]) as { title: string; body: string; action_items: string[] };
}

// ---- Main service ----

export const generateRecommendation = async (input: GenerateRecommendationInput) => {
  const { context_type, entity_id, extra_context } = input;

  // Build context data
  const contextBuilders: Record<string, () => Promise<string>> = {
    song: () => buildSongContext(entity_id),
    release: () => buildReleaseContext(entity_id),
    fan_engagement: () => buildFanContext(),
    content: () => buildContentContext(),
    sync: () => buildSyncContext(),
  };

  const contextData = await contextBuilders[context_type]();
  const fullContext = extra_context ? `${contextData}\nAdditional context: ${extra_context}` : contextData;

  let recommendation: { title: string; body: string; action_items: string[] };
  let usedAI = false;

  if (process.env.ANTHROPIC_API_KEY) {
    const prompt = `You are an expert music industry advisor for DATIAM OS, an artist business operating system.

Artist context: ${fullContext}

Generate a focused, actionable recommendation for the "${context_type}" area of the artist's business.

Respond ONLY with valid JSON in this exact format (no markdown, no explanation outside the JSON):
{
  "title": "Short recommendation title (max 10 words)",
  "body": "2-3 sentence explanation of the recommendation and why it matters for this specific context.",
  "action_items": ["Specific action 1", "Specific action 2", "Specific action 3", "Specific action 4"]
}`;

    try {
      recommendation = await callAnthropic(prompt);
      usedAI = true;
    } catch {
      recommendation = ruleBasedRecommendation(context_type, fullContext);
    }
  } else {
    recommendation = ruleBasedRecommendation(context_type, fullContext);
  }

  // Map context_type to schema enums
  const entityTypeMap: Record<string, 'song' | 'release' | 'fan' | 'content_idea' | 'sync_pitch'> = {
    song: 'song',
    release: 'release',
    fan_engagement: 'fan',
    content: 'content_idea',
    sync: 'sync_pitch',
  };

  const recTypeMap: Record<string, 'content' | 'release_timing' | 'sync_pitch' | 'fan_engagement' | 'marketing'> = {
    song: 'content',
    release: 'release_timing',
    fan_engagement: 'fan_engagement',
    content: 'content',
    sync: 'sync_pitch',
  };

  const [saved] = await db
    .insert(ai_recommendations)
    .values({
      recommendation_type: recTypeMap[context_type],
      entity_type: entityTypeMap[context_type],
      entity_id: entity_id ?? null,
      title: recommendation.title,
      body: recommendation.body,
      action_items: recommendation.action_items,
      confidence_score: usedAI ? '0.85' : '0.70',
      dismissed: false,
    })
    .returning();

  return { ...saved, used_ai: usedAI, context_data: fullContext };
};

export const listRecommendations = async (limit = 20) => {
  return db
    .select()
    .from(ai_recommendations)
    .where(sql`${ai_recommendations.dismissed} = false`)
    .orderBy(desc(ai_recommendations.created_at))
    .limit(limit);
};

export const acceptRecommendation = async (id: string) => {
  const [updated] = await db
    .update(ai_recommendations)
    .set({ accepted: true })
    .where(eq(ai_recommendations.id, id))
    .returning();
  if (!updated) throw new AppError('Recommendation not found', 404);
  return updated;
};

export const dismissRecommendation = async (id: string) => {
  const [updated] = await db
    .update(ai_recommendations)
    .set({ dismissed: true })
    .where(eq(ai_recommendations.id, id))
    .returning();
  if (!updated) throw new AppError('Recommendation not found', 404);
  return updated;
};

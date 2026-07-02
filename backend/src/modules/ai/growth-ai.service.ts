import { eq, desc, avg, sum, count, and } from 'drizzle-orm';
import { db } from '../../db';
import { content_ideas, artist_profiles, fan_profiles, releases, crm_contacts } from '../../db/schema';
import {
  campaigns,
  analytics_snapshots,
  social_accounts,
  trend_reports,
  platform_definitions,
} from '../../db/growth-schema';
import { AppError } from '../../middleware/errorHandler';

const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages';
const AI_MODEL = 'claude-haiku-4-5-20251001';

async function callAnthropic(systemPrompt: string, userMessage: string): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new AppError('AI service not configured', 503);

  const response = await fetch(ANTHROPIC_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: AI_MODEL,
      max_tokens: 1024,
      messages: [{ role: 'user', content: userMessage }],
      system: systemPrompt,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new AppError(`AI generation failed: ${error}`, 502);
  }

  const data = (await response.json()) as { content: Array<{ type: string; text: string }> };
  return data.content[0]?.text ?? '';
}

// ── Context Builders ─────────────────────────────────────────────────────────

async function buildContentContext(contentId: string): Promise<string> {
  const [content] = await db
    .select()
    .from(content_ideas)
    .where(eq(content_ideas.id, contentId));
  if (!content) return 'No content found.';

  return [
    `Content Type: ${content.content_type}`,
    content.title ? `Title: ${content.title}` : null,
    content.hook ? `Hook: ${content.hook}` : null,
    (content as any).mood ? `Mood: ${(content as any).mood}` : null,
    (content as any).genre ? `Genre: ${(content as any).genre}` : null,
    (content as any).musical_key ? `Key: ${(content as any).musical_key}` : null,
    content.platform ? `Platform: ${content.platform}` : null,
    content.script ? `Script excerpt: ${content.script?.slice(0, 300)}` : null,
  ]
    .filter(Boolean)
    .join('\n');
}

async function buildCampaignContext(campaignId: string): Promise<string> {
  const [campaign] = await db
    .select()
    .from(campaigns)
    .where(eq(campaigns.id, campaignId));
  if (!campaign) return 'No campaign found.';

  return [
    `Campaign: ${campaign.name}`,
    `Type: ${campaign.campaign_type}`,
    `Status: ${campaign.status}`,
    campaign.description ? `Description: ${campaign.description}` : null,
    campaign.current_stage ? `Stage: ${campaign.current_stage}` : null,
    campaign.target_streams ? `Target streams: ${campaign.target_streams}` : null,
    campaign.target_followers ? `Target followers: ${campaign.target_followers}` : null,
  ]
    .filter(Boolean)
    .join('\n');
}

async function buildArtistContext(artistId: string): Promise<string> {
  const [artist] = await db
    .select()
    .from(artist_profiles)
    .where(eq(artist_profiles.id, artistId));
  if (!artist) return 'No artist found.';

  return [
    `Artist: ${artist.stage_name}`,
    artist.genre ? `Genre: ${artist.genre}` : null,
    artist.bio ? `Bio: ${artist.bio?.slice(0, 200)}` : null,
  ]
    .filter(Boolean)
    .join('\n');
}

async function buildAnalyticsContext(artistId: string): Promise<string> {
  const accountIds = await db
    .select({ id: social_accounts.id, platform: platform_definitions.name, followers: social_accounts.followers_count })
    .from(social_accounts)
    .innerJoin(platform_definitions, eq(social_accounts.platform_id, platform_definitions.id))
    .where(eq(social_accounts.artist_id, artistId));

  if (!accountIds.length) return 'No social accounts connected.';

  const lines = accountIds.map((a) => `${a.platform}: ${a.followers?.toLocaleString() ?? 0} followers`);

  const [totals] = await db
    .select({
      avg_views: avg(analytics_snapshots.views),
      avg_reach: avg(analytics_snapshots.reach),
      avg_likes: avg(analytics_snapshots.likes),
      avg_shares: avg(analytics_snapshots.shares),
    })
    .from(analytics_snapshots)
    .where(
      and(
        ...accountIds.map((a) => eq(analytics_snapshots.social_account_id, a.id)),
      ),
    );

  return [
    'Social accounts: ' + lines.join(', '),
    totals?.avg_views ? `Avg daily views: ${Math.round(Number(totals.avg_views)).toLocaleString()}` : null,
    totals?.avg_reach ? `Avg daily reach: ${Math.round(Number(totals.avg_reach)).toLocaleString()}` : null,
    totals?.avg_likes ? `Avg likes/day: ${Math.round(Number(totals.avg_likes)).toLocaleString()}` : null,
  ]
    .filter(Boolean)
    .join('\n');
}

async function buildFanContext(artistId: string): Promise<string> {
  const [fanStats] = await db
    .select({
      total_fans: count(fan_profiles.id),
      avg_ambassador: avg((fan_profiles as any).ambassador_score),
      avg_fan_score: avg((fan_profiles as any).fan_score),
    })
    .from(fan_profiles)
    .where(eq((fan_profiles as any).artist_id, artistId));

  if (!fanStats || Number(fanStats.total_fans) === 0) return 'No fan data available.';

  return [
    `Total fans tracked: ${fanStats.total_fans}`,
    fanStats.avg_fan_score ? `Avg fan score: ${Number(fanStats.avg_fan_score).toFixed(1)}` : null,
    fanStats.avg_ambassador ? `Avg ambassador score: ${Number(fanStats.avg_ambassador).toFixed(1)}` : null,
  ]
    .filter(Boolean)
    .join('\n');
}

async function buildReleasesContext(artistId: string): Promise<string> {
  const recentReleases = await db
    .select()
    .from(releases)
    .where(eq((releases as any).artist_id, artistId))
    .orderBy(desc((releases as any).release_date))
    .limit(4);

  if (!recentReleases.length) return 'No releases found.';

  return recentReleases
    .map((r: any) =>
      `${r.title} (${r.release_type ?? 'release'}) — ${r.release_date ?? 'TBD'} — status: ${r.status ?? 'unknown'}`,
    )
    .join('\n');
}

// ── Generation Methods ───────────────────────────────────────────────────────

const SYSTEM_GROWTH = `You are DATIAM Growth AI — a specialist in music marketing and social media growth for independent artists. Respond concisely and practically. Output only the requested content, no preamble or explanation.`;

export class GrowthAIService {
  async generateCaption(contentId: string, platformSlug: string): Promise<{ caption: string }> {
    const contentCtx = await buildContentContext(contentId);
    const prompt = `Platform: ${platformSlug}\n\nContent:\n${contentCtx}\n\nWrite a compelling social media caption for this content. Include the hook, value for the audience, and a call-to-action. Keep it authentic and platform-appropriate. Max 280 characters for Twitter/X, up to 2200 for Instagram/TikTok.`;

    const caption = await callAnthropic(SYSTEM_GROWTH, prompt);
    return { caption: caption.trim() };
  }

  async generateHashtags(contentId: string, platformSlug: string): Promise<{ hashtags: string[] }> {
    const contentCtx = await buildContentContext(contentId);
    const prompt = `Platform: ${platformSlug}\n\nContent:\n${contentCtx}\n\nGenerate 15-25 relevant hashtags for this music content. Mix high-volume (#music), mid-volume (#afropop), and niche (#nigerianafropop) tags. Return only the hashtags as a JSON array of strings, e.g. ["#music", "#afrobeats"].`;

    const raw = await callAnthropic(SYSTEM_GROWTH, prompt);
    try {
      const match = raw.match(/\[[\s\S]*\]/);
      const hashtags = match ? JSON.parse(match[0]) : [];
      return { hashtags };
    } catch {
      const hashtags = raw.match(/#\w+/g) ?? [];
      return { hashtags };
    }
  }

  async generateCTA(contentId: string, platformSlug: string, goal: string): Promise<{ cta: string }> {
    const contentCtx = await buildContentContext(contentId);
    const prompt = `Platform: ${platformSlug}\nGoal: ${goal}\n\nContent:\n${contentCtx}\n\nWrite a single, punchy call-to-action sentence (max 50 words) that drives the specified goal. Be direct and action-oriented.`;

    const cta = await callAnthropic(SYSTEM_GROWTH, prompt);
    return { cta: cta.trim() };
  }

  async generateCampaignBrief(campaignId: string, artistId: string): Promise<{ brief: string }> {
    const [campaignCtx, artistCtx] = await Promise.all([
      buildCampaignContext(campaignId),
      buildArtistContext(artistId),
    ]);

    const prompt = `Artist:\n${artistCtx}\n\nCampaign:\n${campaignCtx}\n\nWrite a concise campaign brief (200-300 words) covering: campaign goal, target audience, key messages, content strategy, and success metrics. Format as paragraphs, not bullet points.`;

    const brief = await callAnthropic(SYSTEM_GROWTH, prompt);
    return { brief: brief.trim() };
  }

  async generateCampaignRetrospective(campaignId: string): Promise<{ retrospective: string }> {
    const campaignCtx = await buildCampaignContext(campaignId);
    const prompt = `Campaign:\n${campaignCtx}\n\nWrite a campaign retrospective analysis covering: what worked well, what could be improved, key learnings, and specific recommendations for the next campaign. Be direct and actionable. 300-400 words.`;

    const retrospective = await callAnthropic(SYSTEM_GROWTH, prompt);
    return { retrospective: retrospective.trim() };
  }

  async generateTrendContentIdea(trendId: string, artistId: string): Promise<{ idea: string; hook: string; script_outline: string }> {
    const [trend] = await db
      .select({ trend: trend_reports, platform: platform_definitions })
      .from(trend_reports)
      .leftJoin(platform_definitions, eq(trend_reports.platform_id, platform_definitions.id))
      .where(eq(trend_reports.id, trendId));

    const artistCtx = await buildArtistContext(artistId);
    const trendCtx = trend
      ? `Trend: ${trend.trend.title}\nCategory: ${trend.trend.category}\nDescription: ${trend.trend.description ?? ''}\nPlatform: ${trend.platform?.name ?? 'Any'}`
      : 'Unknown trend';

    const prompt = `Artist:\n${artistCtx}\n\nTrend:\n${trendCtx}\n\nGenerate a specific content idea for this artist to participate in this trend. Return a JSON object with: idea (one sentence), hook (opening line for the video/post), script_outline (3-5 bullet points). Output JSON only.`;

    const raw = await callAnthropic(SYSTEM_GROWTH, prompt);
    try {
      const match = raw.match(/\{[\s\S]*\}/);
      return match ? JSON.parse(match[0]) : { idea: raw, hook: '', script_outline: '' };
    } catch {
      return { idea: raw.trim(), hook: '', script_outline: '' };
    }
  }

  async generateGrowthReport(artistId: string, period: string): Promise<{ report: string }> {
    const artistCtx = await buildArtistContext(artistId);
    const accounts = await db
      .select({ platform: platform_definitions.name, followers: social_accounts.followers_count })
      .from(social_accounts)
      .innerJoin(platform_definitions, eq(social_accounts.platform_id, platform_definitions.id))
      .where(eq(social_accounts.artist_id, artistId));

    const accountSummary = accounts
      .map((a) => `${a.platform}: ${a.followers?.toLocaleString()} followers`)
      .join(', ');

    const prompt = `Artist:\n${artistCtx}\n\nCurrent social presence: ${accountSummary || 'No accounts connected'}\n\nPeriod: ${period}\n\nWrite a concise growth report (250-350 words) covering: current state, growth opportunities, platform-specific recommendations, and 3 priority actions for the next 30 days.`;

    const report = await callAnthropic(SYSTEM_GROWTH, prompt);
    return { report: report.trim() };
  }

  async generatePostingSchedule(artistId: string, platformSlug: string): Promise<{ schedule: unknown }> {
    const artistCtx = await buildArtistContext(artistId);
    const prompt = `Artist:\n${artistCtx}\n\nPlatform: ${platformSlug}\n\nGenerate an optimal posting schedule for the next 7 days. Return a JSON array where each item has: day (Mon-Sun), time (HH:MM UTC), content_type (short_video/post/story/reel), and theme (1-3 words). Output JSON array only.`;

    const raw = await callAnthropic(SYSTEM_GROWTH, prompt);
    try {
      const match = raw.match(/\[[\s\S]*\]/);
      const schedule = match ? JSON.parse(match[0]) : [];
      return { schedule };
    } catch {
      return { schedule: [] };
    }
  }

  async generateContentCalendar(
    artistId: string,
    startDate: string,
    days: number,
    platforms: string[],
  ): Promise<{ calendar: unknown[] }> {
    const [artistCtx, analyticsCtx, releasesCtx] = await Promise.all([
      buildArtistContext(artistId),
      buildAnalyticsContext(artistId),
      buildReleasesContext(artistId),
    ]);

    const prompt = `Artist:\n${artistCtx}\n\nAnalytics:\n${analyticsCtx}\n\nUpcoming/Recent Releases:\n${releasesCtx}\n\nPlatforms: ${platforms.join(', ')}\nStart date: ${startDate}\nDays: ${days}\n\nGenerate a ${days}-day content calendar. Return a JSON array where each item has: date (YYYY-MM-DD), platform, content_type (short_video/carousel/story/post/reel/live), idea (1 sentence), hook (opening line), hashtags (array of 5 strings), posting_time (HH:MM UTC), goal (streams/followers/engagement/awareness). Space posts evenly across the ${days} days. Output JSON array only.`;

    const raw = await callAnthropic(SYSTEM_GROWTH, prompt);
    try {
      const match = raw.match(/\[[\s\S]*\]/);
      const calendar = match ? JSON.parse(match[0]) : [];
      return { calendar };
    } catch {
      return { calendar: [] };
    }
  }

  async generateAudiencePersona(artistId: string): Promise<{ persona: unknown }> {
    const [artistCtx, analyticsCtx, fanCtx] = await Promise.all([
      buildArtistContext(artistId),
      buildAnalyticsContext(artistId),
      buildFanContext(artistId),
    ]);

    const prompt = `Artist:\n${artistCtx}\n\nAnalytics:\n${analyticsCtx}\n\nFan Data:\n${fanCtx}\n\nDerive an audience persona for this artist's fanbase. Return a JSON object with: persona_name (creative name for the archetypal fan), age_range, gender_split (e.g. "60% female, 40% male"), top_countries (array of 3), interests (array of 6 interests beyond music), platform_behavior (object: primary_platform, peak_hours, content_preference), motivations (array of 3), pain_points (array of 2), how_they_discovered_artist (1 sentence), fan_loyalty_level (casual/regular/dedicated/superfan). Output JSON only.`;

    const raw = await callAnthropic(SYSTEM_GROWTH, prompt);
    try {
      const match = raw.match(/\{[\s\S]*\}/);
      const persona = match ? JSON.parse(match[0]) : { persona_name: 'Unknown', error: 'Could not parse' };
      return { persona };
    } catch {
      return { persona: {} };
    }
  }

  async generateCollaborationPitch(artistId: string, contactId: string): Promise<{ subject: string; message: string }> {
    const artistCtx = await buildArtistContext(artistId);

    const [contact] = await db
      .select()
      .from(crm_contacts)
      .where(eq(crm_contacts.id, contactId));
    if (!contact) throw new AppError('Contact not found', 404);

    const contactCtx = [
      `Contact: ${contact.name}`,
      `Type: ${contact.contact_type}`,
      (contact as any).followers ? `Followers: ${Number((contact as any).followers).toLocaleString()}` : null,
      (contact as any).genres ? `Genres: ${JSON.stringify((contact as any).genres)}` : null,
      (contact as any).city ? `Location: ${(contact as any).city}` : null,
    ]
      .filter(Boolean)
      .join('\n');

    const prompt = `Artist (sender):\n${artistCtx}\n\nContact (recipient):\n${contactCtx}\n\nWrite a personalised collaboration outreach message. Return a JSON object with: subject (email subject line, max 60 chars), message (the full message body, 80-120 words, conversational, no cringe, specific about why this collaboration makes sense, includes a clear ask). Output JSON only.`;

    const raw = await callAnthropic(SYSTEM_GROWTH, prompt);
    try {
      const match = raw.match(/\{[\s\S]*\}/);
      const parsed = match ? JSON.parse(match[0]) : null;
      return {
        subject: parsed?.subject ?? 'Collaboration opportunity',
        message: parsed?.message ?? raw.trim(),
      };
    } catch {
      return { subject: 'Collaboration opportunity', message: raw.trim() };
    }
  }

  async scoreContentBrief(contentId: string): Promise<{
    score: number;
    breakdown: { viral_potential: number; authenticity: number; platform_fit: number; trend_alignment: number };
    suggestions: string[];
  }> {
    const contentCtx = await buildContentContext(contentId);

    const prompt = `Content brief:\n${contentCtx}\n\nScore this content brief for a music artist. Return a JSON object with: score (0-100 overall), breakdown (object with viral_potential, authenticity, platform_fit, trend_alignment — each 0-100), suggestions (array of 3 specific improvement recommendations). Be honest and critical. Output JSON only.`;

    const raw = await callAnthropic(SYSTEM_GROWTH, prompt);
    try {
      const match = raw.match(/\{[\s\S]*\}/);
      const parsed = match ? JSON.parse(match[0]) : null;
      return {
        score: parsed?.score ?? 50,
        breakdown: parsed?.breakdown ?? { viral_potential: 50, authenticity: 50, platform_fit: 50, trend_alignment: 50 },
        suggestions: parsed?.suggestions ?? [],
      };
    } catch {
      return {
        score: 50,
        breakdown: { viral_potential: 50, authenticity: 50, platform_fit: 50, trend_alignment: 50 },
        suggestions: [],
      };
    }
  }

  async generateReleaseStrategy(campaignId: string): Promise<{ strategy: unknown }> {
    const campaignCtx = await buildCampaignContext(campaignId);

    const [campaign] = await db.select({ artist_id: campaigns.artist_id }).from(campaigns).where(eq(campaigns.id, campaignId));
    const [artistCtx, releasesCtx] = campaign?.artist_id
      ? await Promise.all([buildArtistContext(campaign.artist_id!), buildReleasesContext(campaign.artist_id!)])
      : ['', ''];

    const prompt = `Artist:\n${artistCtx}\n\nCampaign:\n${campaignCtx}\n\nRecent Releases:\n${releasesCtx}\n\nGenerate a release strategy. Return a JSON object with: pre_release (array of 5 actions with timeline in days before release), release_day (array of 3 actions for launch day), post_release (array of 4 actions for weeks 1-4 after release), dsp_pitch_angles (array of 3 playlist/editorial pitching angles), playlist_targets (array of 5 playlist types to target), media_approach (1 paragraph on PR/blog/influencer approach), key_metrics (array of 4 KPIs to track). Output JSON only.`;

    const raw = await callAnthropic(SYSTEM_GROWTH, prompt);
    try {
      const match = raw.match(/\{[\s\S]*\}/);
      const strategy = match ? JSON.parse(match[0]) : {};
      return { strategy };
    } catch {
      return { strategy: {} };
    }
  }

  async enrichContentIdea(contentId: string, platformSlug: string): Promise<{
    content_id: string;
    caption: string;
    hashtags: string[];
    cta: string;
    score: number;
    score_breakdown: unknown;
    suggestions: string[];
  }> {
    const [captionResult, hashtagResult, ctaResult, scoreResult] = await Promise.all([
      this.generateCaption(contentId, platformSlug),
      this.generateHashtags(contentId, platformSlug),
      this.generateCTA(contentId, platformSlug, 'streams'),
      this.scoreContentBrief(contentId),
    ]);

    await db
      .update(content_ideas)
      .set({
        caption: captionResult.caption,
        hashtags: hashtagResult.hashtags as any,
        cta: ctaResult.cta,
        performance_score: scoreResult.score.toString(),
        ai_notes: JSON.stringify({ score_breakdown: scoreResult.breakdown, suggestions: scoreResult.suggestions }),
        updated_at: new Date(),
      } as any)
      .where(eq(content_ideas.id, contentId));

    return {
      content_id: contentId,
      caption: captionResult.caption,
      hashtags: hashtagResult.hashtags,
      cta: ctaResult.cta,
      score: scoreResult.score,
      score_breakdown: scoreResult.breakdown,
      suggestions: scoreResult.suggestions,
    };
  }
}

export const growthAIService = new GrowthAIService();

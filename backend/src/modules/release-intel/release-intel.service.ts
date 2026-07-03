import { eq, desc } from 'drizzle-orm';
import { db } from '../../db';
import {
  releases,
  release_intel_analysis,
  release_executive_briefs,
  release_missions,
  type Release,
  type NewReleaseIntelAnalysis,
  type NewReleaseExecutiveBrief,
  type NewReleaseMission,
} from '../../db/schema';
import { AppError } from '../../middleware/errorHandler';
import { logActivity } from '../../lib/activityLogger';
import { contentVaultService } from '../content/content-vault.service';
import { runIntelligence } from '../intelligence-core/intelligence-core.service';
import type { IntelligenceContext, ProviderResult } from '../intelligence-core/intelligence-core.types';
import type { UpdateMissionInput } from './release-intel.schema';

// ── Timing / countries / DSP recommendation ──────────────────────────────────
// Release-specific business logic — not a generic Intelligence Core provider,
// since "when/where/which DSP" is a decision about this release, not a
// reusable score other domains would consume the same way.

const DSP_FIELDS: Array<{ field: keyof Release; platform: string }> = [
  { field: 'spotify_url', platform: 'Spotify' },
  { field: 'apple_music_url', platform: 'Apple Music' },
  { field: 'audiomack_url', platform: 'Audiomack' },
  { field: 'boomplay_url', platform: 'Boomplay' },
  { field: 'youtube_url', platform: 'YouTube Music' },
];

export interface TimingRecommendation {
  recommendedReleaseWindow: {
    earliestSubmission: string | null;
    targetReleaseDate: string | null;
    leadTimeDays: number | null;
    reasoning: string;
  };
  recommendedCountries: Array<{ country: string; score: number; source: string }>;
  recommendedDsps: Array<{ platform: string; configured: boolean; priority: 'ready' | 'action_needed' }>;
  rolloutStrategy: { phase: string; recommendation: string };
  dataCompleteness: 'full' | 'metadata_only';
}

export function recommendTimingCountriesDsps(ctx: IntelligenceContext): TimingRecommendation {
  const { release, artist, platformTopCountries, fanCountryBreakdown, pastReleaseCount } = ctx;

  const releaseDate = release.release_date ? new Date(release.release_date) : null;
  const leadTimeDays = releaseDate ? Math.round((releaseDate.getTime() - Date.now()) / 86_400_000) : null;
  const recommendedReleaseWindow = {
    earliestSubmission: releaseDate ? new Date(releaseDate.getTime() - 28 * 86_400_000).toISOString().slice(0, 10) : null,
    targetReleaseDate: release.release_date,
    leadTimeDays,
    reasoning:
      leadTimeDays === null
        ? 'No release date set — commit to a date with at least 3-4 weeks of DSP submission lead time to be eligible for editorial playlist consideration.'
        : leadTimeDays < 0
          ? 'Release date is in the past — this analysis reflects a live or overdue release.'
          : leadTimeDays >= 21
            ? 'Release date gives sufficient runway (3+ weeks) for DSP editorial pitching.'
            : `Only ${leadTimeDays} day(s) of lead time — DSP editorial placement is unlikely at this notice; expect distributor auto-approval only.`,
  };

  const countryScores: Record<string, number> = {};
  platformTopCountries.forEach((country, i) => {
    countryScores[country] = (countryScores[country] ?? 0) + (platformTopCountries.length - i) * 3;
  });
  Object.entries(fanCountryBreakdown).forEach(([country, n]) => {
    if (country === 'unknown') return;
    countryScores[country] = (countryScores[country] ?? 0) + n;
  });

  // Only actual fan/platform behavioral data counts as "full" — the artist's
  // stated home market is a reasonable tiebreaker, not evidence of where the
  // audience actually is.
  const hasRealGeoSignal = Object.keys(countryScores).length > 0;
  if (artist?.country) countryScores[artist.country] = (countryScores[artist.country] ?? 0) + 5;
  const recommendedCountries = hasRealGeoSignal
    ? Object.entries(countryScores)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([country, score]) => ({ country, score, source: 'fan_and_platform_data' }))
    : [{ country: artist?.country ?? 'Unknown', score: 0, source: 'no_fan_or_platform_data_available_defaulting_to_artist_home_market' }];

  const recommendedDsps = DSP_FIELDS.map(({ field, platform }) => ({
    platform,
    configured: Boolean(release[field]),
    priority: release[field] ? ('ready' as const) : ('action_needed' as const),
  }));

  const rolloutStrategy = {
    phase: pastReleaseCount === 0 ? 'debut' : pastReleaseCount < 3 ? 'building_momentum' : 'established',
    recommendation:
      pastReleaseCount === 0
        ? 'First release — front-load pre-save and content teasers to establish a fanbase baseline before the release date.'
        : `${pastReleaseCount} prior release(s) by this artist — leverage the existing fan base for pre-save conversion and prioritize retargeting known superfans.`,
  };

  return {
    recommendedReleaseWindow,
    recommendedCountries,
    recommendedDsps,
    rolloutStrategy,
    dataCompleteness: hasRealGeoSignal ? 'full' : 'metadata_only',
  };
}

// ── Executive brief ───────────────────────────────────────────────────────────

interface BriefContent {
  summary: string;
  strengths: string[];
  weaknesses: string[];
  commercial_outlook: string;
  viral_outlook: string;
  sync_outlook: string;
  playlist_outlook: string;
  audience_recommendations: string[];
  priority_actions: string[];
  risk_assessment: string;
  execution_plan_30d: string[];
}

async function callAnthropicForBrief(prompt: string): Promise<BriefContent> {
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
      max_tokens: 1500,
      messages: [{ role: 'user', content: prompt }],
    }),
  });

  if (!response.ok) throw new Error(`Anthropic API error: ${response.status}`);

  const data = (await response.json()) as { content: Array<{ text: string }> };
  const raw = data.content?.[0]?.text ?? '';
  const match = raw.match(/\{[\s\S]*\}/);
  if (!match) throw new Error('Failed to parse AI response');
  return JSON.parse(match[0]) as BriefContent;
}

function ruleBasedBrief(
  release: Release,
  results: Record<string, ProviderResult>,
  timing: TimingRecommendation,
): BriefContent {
  const commercial = results.commercial;
  const sync = results.sync;
  const playlist = results.playlist;

  const strengths: string[] = [];
  const weaknesses: string[] = [];

  if (commercial.score !== null && commercial.score >= 60) strengths.push(`Strong commercial signal (${commercial.score}/100).`);
  else weaknesses.push(commercial.score !== null ? `Commercial potential is moderate (${commercial.score}/100).` : 'Commercial potential is unscored — no audio analysis available yet.');

  if (playlist.score !== null && playlist.score >= 60) strengths.push(`Good playlist fit (${playlist.score}/100).`);
  else weaknesses.push(playlist.score !== null ? `Playlist fit is moderate (${playlist.score}/100).` : 'Playlist fit is unscored — missing genre, BPM, or audio data.');

  if (sync.score !== null && sync.score >= 50) strengths.push(`Meaningful sync licensing opportunity (${sync.score}/100).`);

  const priorityActions: string[] = [];
  if (!release.spotify_url) priorityActions.push('Submit to Spotify for Artists for editorial playlist consideration.');
  if (commercial.dataCompleteness === 'metadata_only' || sync.dataCompleteness === 'metadata_only') {
    priorityActions.push('Upload final audio and run Sync Intelligence to unlock a full commercial and sync report.');
  }
  priorityActions.push('Review the auto-created missions below and assign an owner to each.');

  return {
    summary: `"${release.release_title}" is a ${release.release_type} in ${release.genre ?? 'an unspecified genre'}. ` +
      `Commercial score: ${commercial.score ?? 'not yet scored'}, playlist fit: ${playlist.score ?? 'not yet scored'}, sync score: ${sync.score ?? 'not yet scored'}.`,
    strengths: strengths.length > 0 ? strengths : ['No standout strengths identified yet from the data currently available.'],
    weaknesses: weaknesses.length > 0 ? weaknesses : ['No significant weaknesses identified from the data currently available.'],
    commercial_outlook: commercial.summary,
    viral_outlook: playlist.score !== null && playlist.score >= 70
      ? 'Strong energy and playlist-fit signals suggest good potential for short-form (Reels/TikTok) virality.'
      : 'Viral outlook is uncertain without more audio and audience data — content testing is recommended before investing heavily in paid promotion.',
    sync_outlook: sync.summary,
    playlist_outlook: playlist.summary,
    audience_recommendations: timing.recommendedCountries.map((c) => `Target ${c.country} listeners (source: ${c.source}).`),
    priority_actions: priorityActions,
    risk_assessment: timing.recommendedReleaseWindow.leadTimeDays !== null && timing.recommendedReleaseWindow.leadTimeDays < 21
      ? 'Timeline risk: insufficient lead time remains for DSP editorial playlist pitching ahead of the release date.'
      : 'No major timeline risk identified based on the current release date.',
    execution_plan_30d: [
      'Week 1: finalize metadata, artwork, and outstanding DSP submissions.',
      'Week 2: launch pre-save/pre-add campaign and begin content teasers.',
      'Week 3 (release week): coordinate playlist pitching, press, and fan outreach.',
      'Week 4: review streaming/engagement data from Release Intel and adjust content cadence.',
    ],
  };
}

export interface ExecutiveBriefResult {
  content: BriefContent;
  usedAI: boolean;
  confidenceScore: number;
}

export async function generateExecutiveBrief(
  ctx: IntelligenceContext,
  results: Record<string, ProviderResult>,
  timing: TimingRecommendation,
): Promise<ExecutiveBriefResult> {
  const { release } = ctx;
  const { commercial, sync, playlist } = results;

  const prompt = `You are an expert A&R and music marketing strategist for DATIAM OS, an artist growth operating system.

Release: "${release.release_title}" (${release.release_type}), genre: ${release.genre ?? 'unknown'}, release date: ${release.release_date ?? 'TBD'}.
Commercial score: ${commercial.score ?? 'unscored'}/100 — ${commercial.summary}
Playlist suitability score: ${playlist.score ?? 'unscored'}/100 — ${playlist.summary}
Sync licensing score: ${sync.score ?? 'unscored'}/100 — ${sync.summary}
Recommended target countries: ${timing.recommendedCountries.map((c) => c.country).join(', ')}
Lead time to release date: ${timing.recommendedReleaseWindow.leadTimeDays ?? 'unknown'} day(s).
Prior releases by this artist: ${ctx.pastReleaseCount}.

Write a concise, specific executive brief for this release. Respond ONLY with valid JSON in this exact shape (no markdown, no explanation outside the JSON):
{
  "summary": "2-3 sentence overview of the release's commercial position",
  "strengths": ["specific strength 1", "specific strength 2"],
  "weaknesses": ["specific weakness 1", "specific weakness 2"],
  "commercial_outlook": "1-2 sentences",
  "viral_outlook": "1-2 sentences",
  "sync_outlook": "1-2 sentences",
  "playlist_outlook": "1-2 sentences",
  "audience_recommendations": ["specific audience/market recommendation 1", "recommendation 2"],
  "priority_actions": ["specific, concrete action 1", "action 2", "action 3"],
  "risk_assessment": "1-2 sentences identifying the biggest risk",
  "execution_plan_30d": ["Week 1: ...", "Week 2: ...", "Week 3: ...", "Week 4: ..."]
}`;

  if (process.env.ANTHROPIC_API_KEY) {
    try {
      const content = await callAnthropicForBrief(prompt);
      return { content, usedAI: true, confidenceScore: 0.85 };
    } catch {
      return { content: ruleBasedBrief(release, results, timing), usedAI: false, confidenceScore: 0.70 };
    }
  }
  return { content: ruleBasedBrief(release, results, timing), usedAI: false, confidenceScore: 0.70 };
}

// ── Downstream missions ───────────────────────────────────────────────────────
// Declarative work-items only — Release Intel never performs the playlist
// pitching / outreach sending / content publishing itself. Those modules
// read release_missions filtered by mission_type and do the work.

async function createDownstreamMissions(
  ctx: IntelligenceContext,
  results: Record<string, ProviderResult>,
): Promise<void> {
  const { release, artist } = ctx;

  const existing = await db
    .select({ id: release_missions.id })
    .from(release_missions)
    .where(eq(release_missions.release_id, release.id))
    .limit(1);
  if (existing.length > 0) return; // idempotent — missions already exist for this release

  const playlistScore = results.playlist.score;
  const syncScore = results.sync.score;
  const commercialScore = results.commercial.score;

  const missions: NewReleaseMission[] = [
    {
      release_id: release.id,
      artist_id: artist?.id ?? null,
      mission_type: 'playlist',
      title: `Pitch "${release.release_title}" to playlists`,
      description: playlistScore !== null
        ? `Playlist suitability score: ${playlistScore}/100. ${results.playlist.summary}`
        : 'Playlist suitability not yet scored — upload audio to unlock scoring.',
      status: 'pending',
      priority: playlistScore !== null ? Math.round(playlistScore) : 0,
      target_metrics: { target_playlist_adds: playlistScore !== null ? Math.max(3, Math.round(playlistScore / 10)) : 3, suitability_score: playlistScore },
    },
    {
      release_id: release.id,
      artist_id: artist?.id ?? null,
      mission_type: 'sync',
      title: `License "${release.release_title}" for sync placement`,
      description: syncScore !== null
        ? `Sync suitability score: ${syncScore}/100. ${results.sync.summary}`
        : 'Sync suitability requires audio analysis — run Sync Intelligence once audio is uploaded.',
      status: syncScore === null ? 'blocked' : 'pending',
      priority: syncScore !== null ? Math.round(syncScore) : 0,
      target_metrics: { target_pitches: syncScore !== null ? Math.max(2, Math.round(syncScore / 15)) : 0, suitability_score: syncScore },
    },
    {
      release_id: release.id,
      artist_id: artist?.id ?? null,
      mission_type: 'fan_growth',
      title: `Grow the fan base around "${release.release_title}"`,
      description: `Current tracked fan base: ${ctx.fanCount}. Target incremental growth tied to this release cycle.`,
      status: 'pending',
      priority: 50,
      target_metrics: { current_fan_count: ctx.fanCount, target_fan_count: Math.round(ctx.fanCount * 1.1) + 10 },
    },
    {
      release_id: release.id,
      artist_id: artist?.id ?? null,
      mission_type: 'content',
      title: `Content calendar for "${release.release_title}"`,
      description: 'Seeded content ideas for the pre-release, release-day, and post-release windows.',
      status: 'pending',
      priority: 60,
      target_metrics: { seeded_content_ideas: 3 },
    },
    {
      release_id: release.id,
      artist_id: artist?.id ?? null,
      mission_type: 'outreach',
      title: `Press & industry outreach for "${release.release_title}"`,
      description: 'Identify and contact blogs, curators, and industry contacts relevant to this release.',
      status: 'pending',
      priority: 40,
      target_metrics: { target_contacts: 10 },
    },
    {
      release_id: release.id,
      artist_id: artist?.id ?? null,
      mission_type: 'analytics',
      title: `Track performance of "${release.release_title}"`,
      description: 'Baseline established at Release Intel analysis time — monitor streaming and social metrics after release.',
      status: 'pending',
      priority: 30,
      target_metrics: { baseline_commercial_score: commercialScore, baseline_playlist_score: playlistScore, baseline_sync_score: syncScore },
    },
  ];

  await db.insert(release_missions).values(missions);

  // Seed real content_ideas rows via the existing Content Vault service — reused, not duplicated.
  await Promise.allSettled([
    contentVaultService.create({
      content_type: 'reel',
      title: `Teaser: ${release.release_title}`,
      description: 'Pre-release teaser clip.',
      artist_id: artist?.id,
      release_id: release.id,
      genre: release.genre ?? undefined,
    }),
    contentVaultService.create({
      content_type: 'post',
      title: `Release day announcement: ${release.release_title}`,
      description: 'Release-day announcement post.',
      artist_id: artist?.id,
      release_id: release.id,
      genre: release.genre ?? undefined,
    }),
    contentVaultService.create({
      content_type: 'tiktok',
      title: `Post-release hook clip: ${release.release_title}`,
      description: 'Short-form hook clip for the post-release push.',
      artist_id: artist?.id,
      release_id: release.id,
      genre: release.genre ?? undefined,
    }),
  ]);
}

// ── Orchestrator ──────────────────────────────────────────────────────────────

export async function analyzeRelease(releaseId: string, opts: { force?: boolean } = {}): Promise<void> {
  const [existingAnalysis] = await db
    .select()
    .from(release_intel_analysis)
    .where(eq(release_intel_analysis.release_id, releaseId))
    .limit(1);

  if (existingAnalysis && existingAnalysis.status === 'complete' && !opts.force) return;

  try {
    const { context, results } = await runIntelligence(releaseId);
    const timing = recommendTimingCountriesDsps(context);
    const brief = await generateExecutiveBrief(context, results, timing);

    const allFull = ['commercial', 'sync', 'playlist'].every((k) => results[k]?.dataCompleteness === 'full');
    const dataCompleteness: 'full' | 'metadata_only' = allFull ? 'full' : 'metadata_only';

    const analysisValues: Partial<NewReleaseIntelAnalysis> = {
      release_id: releaseId,
      status: 'complete',
      commercial_score: results.commercial.score !== null ? results.commercial.score.toString() : null,
      playlist_score: results.playlist.score !== null ? results.playlist.score.toString() : null,
      sync_score: results.sync.score !== null ? results.sync.score.toString() : null,
      data_completeness: dataCompleteness,
      resolved_audio_upload_id: context.resolvedUpload?.id ?? null,
      recommended_release_window: timing.recommendedReleaseWindow,
      recommended_countries: timing.recommendedCountries,
      recommended_dsps: timing.recommendedDsps,
      rollout_strategy: timing.rolloutStrategy,
      failure_reason: null,
      analyzed_at: new Date(),
      updated_at: new Date(),
    };

    if (existingAnalysis) {
      await db.update(release_intel_analysis).set(analysisValues).where(eq(release_intel_analysis.id, existingAnalysis.id));
    } else {
      await db.insert(release_intel_analysis).values(analysisValues as NewReleaseIntelAnalysis);
    }

    const briefValues: NewReleaseExecutiveBrief = {
      release_id: releaseId,
      summary: brief.content.summary,
      strengths: brief.content.strengths,
      weaknesses: brief.content.weaknesses,
      commercial_outlook: brief.content.commercial_outlook,
      viral_outlook: brief.content.viral_outlook,
      sync_outlook: brief.content.sync_outlook,
      playlist_outlook: brief.content.playlist_outlook,
      audience_recommendations: brief.content.audience_recommendations,
      priority_actions: brief.content.priority_actions,
      risk_assessment: brief.content.risk_assessment,
      execution_plan_30d: brief.content.execution_plan_30d,
      used_ai: brief.usedAI,
      confidence_score: brief.confidenceScore.toString(),
    };
    await db.insert(release_executive_briefs).values(briefValues);

    await createDownstreamMissions(context, results);

    logActivity({
      eventType: 'release_intel.analyzed',
      module: 'release-intel',
      entityType: 'release',
      entityId: releaseId,
      title: `Release Intel analysis complete: ${context.release.release_title}`,
      severity: 'info',
      metadata: {
        release_id: releaseId,
        commercial_score: results.commercial.score,
        playlist_score: results.playlist.score,
        sync_score: results.sync.score,
        data_completeness: dataCompleteness,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (existingAnalysis) {
      await db
        .update(release_intel_analysis)
        .set({ status: 'failed', failure_reason: message, updated_at: new Date() })
        .where(eq(release_intel_analysis.id, existingAnalysis.id));
    } else {
      await db.insert(release_intel_analysis).values({
        release_id: releaseId,
        status: 'failed',
        failure_reason: message,
      } as NewReleaseIntelAnalysis);
    }
    logActivity({
      eventType: 'release_intel.failed',
      module: 'release-intel',
      entityType: 'release',
      entityId: releaseId,
      title: 'Release Intel analysis failed',
      severity: 'error',
      metadata: { release_id: releaseId, error: message },
    });
  }
}

// ── Reads ─────────────────────────────────────────────────────────────────────

export async function getReleaseIntelSnapshot(releaseId: string) {
  const [release] = await db.select().from(releases).where(eq(releases.id, releaseId)).limit(1);
  if (!release) throw new AppError('Release not found', 404, 'RELEASE_NOT_FOUND');

  const [analysisRows, briefRows, missions] = await Promise.all([
    db.select().from(release_intel_analysis).where(eq(release_intel_analysis.release_id, releaseId)).limit(1),
    db.select().from(release_executive_briefs).where(eq(release_executive_briefs.release_id, releaseId)).orderBy(desc(release_executive_briefs.created_at)).limit(1),
    db.select().from(release_missions).where(eq(release_missions.release_id, releaseId)),
  ]);

  return {
    release,
    analysis: analysisRows[0] ?? null,
    brief: briefRows[0] ?? null,
    missions,
  };
}

export async function getBriefHistory(releaseId: string) {
  return db
    .select()
    .from(release_executive_briefs)
    .where(eq(release_executive_briefs.release_id, releaseId))
    .orderBy(desc(release_executive_briefs.created_at));
}

export async function getMissions(releaseId: string) {
  return db.select().from(release_missions).where(eq(release_missions.release_id, releaseId));
}

export async function updateMission(missionId: string, input: UpdateMissionInput) {
  const [existing] = await db.select().from(release_missions).where(eq(release_missions.id, missionId)).limit(1);
  if (!existing) throw new AppError('Mission not found', 404, 'MISSION_NOT_FOUND');

  const values: Partial<NewReleaseMission> = { updated_at: new Date() };
  if (input.status !== undefined) {
    values.status = input.status;
    if (input.status === 'completed') values.completed_at = new Date();
  }
  if (input.progress_percentage !== undefined) values.progress_percentage = input.progress_percentage.toString();
  if (input.due_date !== undefined) values.due_date = input.due_date;
  if (input.priority !== undefined) values.priority = input.priority;

  const [updated] = await db.update(release_missions).set(values).where(eq(release_missions.id, missionId)).returning();
  return updated;
}

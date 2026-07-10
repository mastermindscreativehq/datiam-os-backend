import { eq, desc, and, asc, gte, lte } from 'drizzle-orm';
import { db } from '../../db';
import {
  releases,
  release_checklists,
  release_tasks,
  release_campaigns,
  release_dsp_status,
  release_alerts,
  release_ai_recs,
  artist_profiles,
  songs,
} from '../../db/schema';
import { AppError } from '../../middleware/errorHandler';
import { logActivity } from '../../lib/activityLogger';
import { dispatchEvent } from '../automation/automation.service';
import { AUTOMATION_CATEGORY_EVENTS, type AutomationCategory } from '../automation/automation-categories';
import {
  onCampaignStarted,
  onCampaignCompleted,
  onReleaseUpdated,
} from './release-intelligence.webhooks';
import type {
  CreateCampaignInput,
  UpdateCampaignInput,
  UpdateDspStatusInput,
  UpdateReleaseFieldsInput,
} from './release-intelligence.schema';

const ENGINE_VERSION = 'release-intelligence-v1';

const CHECKLIST_FIELDS = [
  'lyrics_ready', 'cover_art_ready', 'mix_ready', 'master_ready',
  'metadata_ready', 'isrc_ready', 'upc_ready', 'distributor_ready',
  'release_date_ready', 'promo_assets_ready', 'sync_assets_ready', 'final_approval',
] as const;

const DSP_PLATFORMS = [
  'spotify', 'apple_music', 'youtube_music', 'audiomack',
  'boomplay', 'tidal', 'amazon_music', 'deezer',
] as const;

// ─── Readiness Score ──────────────────────────────────────────────────────────

function computeReadinessScore(
  checklist: Record<string, unknown> | null,
  dspStatuses: Array<{ status: string }>,
  campaigns: Array<{ status: string; campaign_type: string }>,
): { score: number; grade: string; breakdown: Record<string, number> } {
  const checklistScore = checklist
    ? (CHECKLIST_FIELDS.filter(f => checklist[f] === true).length / CHECKLIST_FIELDS.length) * 60
    : 0;

  const liveDsps = dspStatuses.filter(d => d.status === 'live').length;
  const dspScore = dspStatuses.length > 0
    ? (liveDsps / Math.max(dspStatuses.length, 3)) * 20
    : 0;

  const activeCampaignTypes = new Set(
    campaigns
      .filter(c => ['active', 'completed'].includes(c.status))
      .map(c => c.campaign_type),
  );
  const campaignScore = (activeCampaignTypes.size / 5) * 20;

  const total = Math.round(checklistScore + dspScore + campaignScore);

  let grade = 'not_ready';
  if (total >= 90) grade = 'release_ready';
  else if (total >= 70) grade = 'almost_ready';
  else if (total >= 40) grade = 'in_progress';

  return {
    score: total,
    grade,
    breakdown: {
      checklist:    Math.round(checklistScore),
      distribution: Math.round(dspScore),
      campaigns:    Math.round(campaignScore),
    },
  };
}

// ─── Alert Generation ─────────────────────────────────────────────────────────

interface AlertSpec {
  alert_type: string;
  severity:   'info' | 'warning' | 'critical';
  title:      string;
  message:    string;
}

function generateAlertSpecs(
  release:    typeof releases.$inferSelect,
  checklist:  Record<string, unknown> | null,
  dspStatuses: Array<typeof release_dsp_status.$inferSelect>,
  campaigns:  Array<typeof release_campaigns.$inferSelect>,
): AlertSpec[] {
  const alerts: AlertSpec[] = [];
  const now = new Date();

  if (release.release_date) {
    const releaseDate = new Date(release.release_date);
    const daysUntil = Math.ceil((releaseDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    if (daysUntil <= 0 && release.music_status !== 'released') {
      alerts.push({
        alert_type: 'release_date_passed',
        severity:   'critical',
        title:      'Release date has passed',
        message:    `"${release.release_title}" was due ${Math.abs(daysUntil)} day(s) ago but hasn't been marked as released.`,
      });
    } else if (daysUntil > 0 && daysUntil <= 7) {
      alerts.push({
        alert_type: 'release_due_soon',
        severity:   daysUntil <= 3 ? 'critical' : 'warning',
        title:      `Release in ${daysUntil} day(s)`,
        message:    `"${release.release_title}" drops in ${daysUntil} day(s). Confirm all assets and DSP submissions are complete.`,
      });
    }
  }

  if (!release.upc) {
    alerts.push({
      alert_type: 'missing_upc',
      severity:   'warning',
      title:      'UPC not registered',
      message:    'This release does not have a UPC code. Register one before distribution.',
    });
  }

  if (!release.cover_art_url && !checklist?.cover_art_ready) {
    alerts.push({
      alert_type: 'missing_cover_art',
      severity:   'warning',
      title:      'Cover art missing',
      message:    'No cover art uploaded or marked ready. DSPs require cover art for all releases.',
    });
  }

  if (!checklist?.master_ready) {
    alerts.push({
      alert_type: 'master_not_ready',
      severity:   'warning',
      title:      'Master not ready',
      message:    'The audio master has not been marked ready. Complete mastering before distribution.',
    });
  }

  for (const dsp of dspStatuses.filter(d => d.status === 'rejected')) {
    alerts.push({
      alert_type: 'dsp_rejected',
      severity:   'critical',
      title:      `Rejected on ${dsp.platform}`,
      message:    `Distribution to ${dsp.platform} was rejected. Review and resubmit.`,
    });
  }

  const hasMarketing = campaigns.some(c => ['marketing', 'pre_save'].includes(c.campaign_type));
  if (!hasMarketing && release.music_status !== 'released') {
    alerts.push({
      alert_type: 'no_marketing_campaign',
      severity:   'info',
      title:      'No marketing campaign',
      message:    'Start a marketing or pre-save campaign to build audience before release.',
    });
  }

  return alerts;
}

// ─── AI Recommendations ───────────────────────────────────────────────────────

function generateRecSpecs(
  release:    typeof releases.$inferSelect,
  checklist:  Record<string, unknown> | null,
  dspStatuses: Array<typeof release_dsp_status.$inferSelect>,
  campaigns:  Array<typeof release_campaigns.$inferSelect>,
  songCount:  number,
): Array<{ rec_type: string; title: string; description: string; priority: number }> {
  const recs: Array<{ rec_type: string; title: string; description: string; priority: number }> = [];
  let priority = 10;

  if (!checklist?.isrc_ready || !checklist?.metadata_ready) {
    recs.push({
      rec_type:    'metadata',
      title:       'Complete ISRC & metadata registration',
      description: 'Register ISRCs for all tracks and fill in complete metadata (genre, language, credits) before submitting to distributors.',
      priority:    priority--,
    });
  }

  if (!dspStatuses.some(d => d.status === 'submitted' || d.status === 'live')) {
    recs.push({
      rec_type:    'distribution',
      title:       'Submit to DSPs now',
      description: 'Major DSPs (Spotify, Apple Music) require 7–14 days lead time. Submit as early as possible to avoid release date slippage.',
      priority:    priority--,
    });
  }

  if (!campaigns.some(c => c.campaign_type === 'pre_save')) {
    recs.push({
      rec_type:    'marketing',
      title:       'Launch a pre-save campaign',
      description: 'Pre-save campaigns on Spotify and Apple Music build first-day streams. Activate at least 14 days before release.',
      priority:    priority--,
    });
  }

  if (!campaigns.some(c => c.campaign_type === 'playlist')) {
    recs.push({
      rec_type:    'playlist',
      title:       'Pitch to playlist curators',
      description: 'Submit for playlist consideration at least 7 days before release. Target editorial and independent playlists in your genre.',
      priority:    priority--,
    });
  }

  if (!campaigns.some(c => c.campaign_type === 'press')) {
    recs.push({
      rec_type:    'press',
      title:       'Send press releases to music blogs',
      description: 'Secure blog premieres and reviews before release day to amplify organic discovery.',
      priority:    priority--,
    });
  }

  if (songCount === 0) {
    recs.push({
      rec_type:    'catalog',
      title:       'Link songs to this release',
      description: 'No songs are linked to this release yet. Add all tracks to ensure ISRC tracking and royalty attribution.',
      priority:    priority--,
    });
  }

  if (release.release_type !== 'single' && (release.total_tracks ?? 0) === 0) {
    recs.push({
      rec_type:    'catalog',
      title:       'Set total track count',
      description: 'EPs and albums require an accurate track count for distributor metadata.',
      priority:    priority--,
    });
  }

  return recs;
}

// ─── Dashboard ────────────────────────────────────────────────────────────────

export const getDashboard = async (artistId?: string) => {
  const conditions = artistId ? [eq(releases.artist_id, artistId)] : [];
  const allReleases = await db
    .select({
      id:            releases.id,
      release_title: releases.release_title,
      release_type:  releases.release_type,
      music_status:  releases.music_status,
      release_state: releases.release_state,
      release_date:  releases.release_date,
      artist_id:     releases.artist_id,
      cover_art_url: releases.cover_art_url,
      upc:           releases.upc,
      distributor:   releases.distributor,
      created_at:    releases.created_at,
    })
    .from(releases)
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(asc(releases.release_date));

  if (!allReleases.length) {
    return {
      releases: [],
      summary: { total: 0, draft: 0, scheduled: 0, released: 0, due_in_30_days: 0, total_alerts: 0, critical_alerts: 0 },
      computed_at: new Date().toISOString(),
      engine_version: ENGINE_VERSION,
    };
  }

  const artistIds = [...new Set(allReleases.map(r => r.artist_id).filter((id): id is string => id !== null))];

  const [checklistRows, campaignRows, dspRows, alertRows, artistRows] = await Promise.all([
    db.select().from(release_checklists),
    db.select().from(release_campaigns).orderBy(desc(release_campaigns.created_at)),
    db.select().from(release_dsp_status),
    db.select().from(release_alerts).where(eq(release_alerts.is_resolved, false)),
    artistIds.length
      ? db.select({ id: artist_profiles.id, stage_name: artist_profiles.stage_name }).from(artist_profiles)
      : Promise.resolve([]),
  ]);

  const checklistMap = new Map(checklistRows.map(c => [c.release_id, c]));
  const campaignMap  = new Map<string, typeof release_campaigns.$inferSelect[]>();
  for (const c of campaignRows) {
    if (!campaignMap.has(c.release_id)) campaignMap.set(c.release_id, []);
    campaignMap.get(c.release_id)!.push(c);
  }
  const dspMap = new Map<string, typeof release_dsp_status.$inferSelect[]>();
  for (const d of dspRows) {
    if (!dspMap.has(d.release_id)) dspMap.set(d.release_id, []);
    dspMap.get(d.release_id)!.push(d);
  }
  const alertMap = new Map<string, typeof release_alerts.$inferSelect[]>();
  for (const a of alertRows) {
    if (!alertMap.has(a.release_id)) alertMap.set(a.release_id, []);
    alertMap.get(a.release_id)!.push(a);
  }
  const artistMap = new Map(artistRows.map(a => [a.id, a]));

  const now   = new Date();
  const in30  = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

  const enriched = allReleases.map(r => {
    const checklist = checklistMap.get(r.id) ?? null;
    const campaigns = campaignMap.get(r.id) ?? [];
    const dsps      = dspMap.get(r.id) ?? [];
    const alerts    = alertMap.get(r.id) ?? [];
    const readiness = computeReadinessScore(checklist, dsps, campaigns);
    return {
      ...r,
      artist:         r.artist_id ? (artistMap.get(r.artist_id) ?? null) : null,
      checklist,
      campaigns,
      dsp_statuses:   dsps,
      active_alerts:  alerts,
      readiness,
    };
  });

  return {
    releases: enriched,
    summary: {
      total:         allReleases.length,
      draft:         allReleases.filter(r => r.music_status === 'draft').length,
      scheduled:     allReleases.filter(r => r.music_status === 'scheduled').length,
      released:      allReleases.filter(r => r.music_status === 'released').length,
      due_in_30_days: allReleases.filter(r =>
        r.release_date && new Date(r.release_date) >= now && new Date(r.release_date) <= in30,
      ).length,
      total_alerts:    alertRows.length,
      critical_alerts: alertRows.filter(a => a.severity === 'critical').length,
    },
    computed_at:    now.toISOString(),
    engine_version: ENGINE_VERSION,
  };
};

// ─── Calendar ─────────────────────────────────────────────────────────────────

export const getCalendar = async (artistId?: string, year?: number, month?: number) => {
  const targetYear  = year  ?? new Date().getFullYear();
  const targetMonth = month ?? (new Date().getMonth() + 1);
  const startDate   = new Date(targetYear, targetMonth - 1, 1);
  const endDate     = new Date(targetYear, targetMonth, 0);

  const conditions: ReturnType<typeof eq>[] = [];
  if (artistId) conditions.push(eq(releases.artist_id, artistId));
  conditions.push(gte(releases.release_date, startDate.toISOString().split('T')[0]));
  conditions.push(lte(releases.release_date, endDate.toISOString().split('T')[0]));

  const rows = await db
    .select({
      id:            releases.id,
      release_title: releases.release_title,
      release_type:  releases.release_type,
      music_status:  releases.music_status,
      release_state: releases.release_state,
      release_date:  releases.release_date,
      artist_id:     releases.artist_id,
      cover_art_url: releases.cover_art_url,
    })
    .from(releases)
    .where(and(...conditions))
    .orderBy(asc(releases.release_date));

  return { year: targetYear, month: targetMonth, releases: rows, total: rows.length };
};

// ─── Release Detail ───────────────────────────────────────────────────────────

export const getReleaseDetail = async (releaseId: string) => {
  const [release] = await db.select().from(releases).where(eq(releases.id, releaseId)).limit(1);
  if (!release) throw new AppError('Release not found', 404);

  const [checklist, campaigns, dsps, alerts, recs, tasks, songRows, artistRow] = await Promise.all([
    db.select().from(release_checklists)
      .where(eq(release_checklists.release_id, releaseId)).limit(1).then(r => r[0] ?? null),
    db.select().from(release_campaigns)
      .where(eq(release_campaigns.release_id, releaseId)).orderBy(asc(release_campaigns.campaign_type)),
    db.select().from(release_dsp_status)
      .where(eq(release_dsp_status.release_id, releaseId)).orderBy(asc(release_dsp_status.platform)),
    db.select().from(release_alerts)
      .where(and(eq(release_alerts.release_id, releaseId), eq(release_alerts.is_resolved, false)))
      .orderBy(desc(release_alerts.created_at)),
    db.select().from(release_ai_recs)
      .where(eq(release_ai_recs.release_id, releaseId)).orderBy(asc(release_ai_recs.priority)),
    db.select().from(release_tasks)
      .where(eq(release_tasks.release_id, releaseId)).orderBy(asc(release_tasks.task_category)),
    db.select({ id: songs.id, title: songs.title, isrc: songs.isrc, track_number: songs.track_number })
      .from(songs).where(eq(songs.release_id, releaseId)).orderBy(asc(songs.track_number)),
    release.artist_id
      ? db.select({ id: artist_profiles.id, stage_name: artist_profiles.stage_name, genre: artist_profiles.genre })
          .from(artist_profiles).where(eq(artist_profiles.id, release.artist_id)).limit(1)
          .then(r => r[0] ?? null)
      : Promise.resolve(null),
  ]);

  const readiness = computeReadinessScore(checklist, dsps, campaigns);

  return {
    release,
    artist:          artistRow,
    checklist,
    campaigns,
    dsp_statuses:    dsps,
    alerts,
    recommendations: recs,
    tasks,
    songs:           songRows,
    readiness,
    timeline:        buildTimeline(release, dsps, campaigns),
    engine_version:  ENGINE_VERSION,
  };
};

// ─── Release Field Updates (migration 0051) ──────────────────────────────────

export const updateRelease = async (releaseId: string, input: UpdateReleaseFieldsInput) => {
  const [existing] = await db.select().from(releases).where(eq(releases.id, releaseId)).limit(1);
  if (!existing) throw new AppError('Release not found', 404);

  const values: Record<string, unknown> = { ...input };
  for (const key of Object.keys(values)) {
    if (values[key] === '') values[key] = null;
  }
  if (values.release_date) values.release_date = String(values.release_date);

  const [updated] = await db
    .update(releases)
    .set({ ...values, updated_at: new Date() })
    .where(eq(releases.id, releaseId))
    .returning();

  await onReleaseUpdated(
    updated as unknown as Record<string, unknown>,
    input as unknown as Record<string, unknown>,
  );
  dispatchEvent('release.updated', { release: updated, changes: input }).catch(() => {});

  return updated;
};

export const dispatchReleaseAutomation = async (
  releaseId: string,
  category: AutomationCategory,
  extra: { notes?: string; metadata?: Record<string, unknown> },
) => {
  const [release] = await db.select().from(releases).where(eq(releases.id, releaseId)).limit(1);
  if (!release) throw new AppError('Release not found', 404);

  const event = AUTOMATION_CATEGORY_EVENTS[category];
  const result = await dispatchEvent(event, {
    category,
    release_id: release.id,
    artist_id: release.artist_id,
    release_title: release.release_title,
    notes: extra.notes,
    ...extra.metadata,
  });

  return { category, ...result };
};

// ─── Timeline ─────────────────────────────────────────────────────────────────

function buildTimeline(
  release:   typeof releases.$inferSelect,
  dsps:      Array<typeof release_dsp_status.$inferSelect>,
  campaigns: Array<typeof release_campaigns.$inferSelect>,
): Array<{ date: string; event: string; status: string; detail: string }> {
  const events: Array<{ date: string; event: string; status: string; detail: string }> = [];

  events.push({
    date:   release.created_at.toISOString(),
    event:  'Release created',
    status: 'completed',
    detail: `"${release.release_title}" was created as a ${release.release_type}`,
  });

  for (const dsp of dsps) {
    if (dsp.submitted_at) {
      events.push({
        date:   dsp.submitted_at.toISOString(),
        event:  `Submitted to ${dsp.platform}`,
        status: dsp.status === 'live' ? 'completed' : dsp.status === 'rejected' ? 'failed' : 'in_progress',
        detail: `Distribution submitted to ${dsp.platform}`,
      });
    }
    if (dsp.live_at) {
      events.push({
        date:   dsp.live_at.toISOString(),
        event:  `Live on ${dsp.platform}`,
        status: 'completed',
        detail: `Release is now live on ${dsp.platform}`,
      });
    }
  }

  for (const c of campaigns) {
    events.push({
      date:   c.created_at.toISOString(),
      event:  `${c.campaign_type} campaign: ${c.title}`,
      status: c.status === 'completed' ? 'completed' : c.status === 'active' ? 'in_progress' : 'planned',
      detail: c.notes ?? `Campaign status: ${c.status}`,
    });
  }

  if (release.release_date) {
    events.push({
      date:   `${release.release_date}T00:00:00.000Z`,
      event:  'Release date',
      status: release.music_status === 'released' ? 'completed' : 'planned',
      detail: `Target release date for "${release.release_title}"`,
    });
  }

  return events.sort((a, b) => a.date.localeCompare(b.date));
}

// ─── DSP Status ───────────────────────────────────────────────────────────────

export const getDspStatuses = async (releaseId: string) => {
  const [release] = await db.select({ id: releases.id }).from(releases)
    .where(eq(releases.id, releaseId)).limit(1);
  if (!release) throw new AppError('Release not found', 404);

  const existing = await db.select().from(release_dsp_status)
    .where(eq(release_dsp_status.release_id, releaseId)).orderBy(asc(release_dsp_status.platform));

  const existingPlatforms = new Set(existing.map(d => d.platform));
  const missing = DSP_PLATFORMS.filter(p => !existingPlatforms.has(p));

  if (missing.length > 0) {
    await db.insert(release_dsp_status).values(missing.map(platform => ({ release_id: releaseId, platform })));
    return db.select().from(release_dsp_status)
      .where(eq(release_dsp_status.release_id, releaseId)).orderBy(asc(release_dsp_status.platform));
  }

  return existing;
};

export const updateDspStatus = async (releaseId: string, platform: string, input: UpdateDspStatusInput) => {
  const [existing] = await db.select().from(release_dsp_status)
    .where(and(eq(release_dsp_status.release_id, releaseId), eq(release_dsp_status.platform, platform)))
    .limit(1);

  if (!existing) {
    const [created] = await db.insert(release_dsp_status).values({
      release_id:   releaseId,
      platform,
      status:       input.status,
      url:          input.url ?? undefined,
      submitted_at: input.submitted_at ? new Date(input.submitted_at) : undefined,
      live_at:      input.live_at      ? new Date(input.live_at)      : undefined,
      notes:        input.notes ?? undefined,
    }).returning();
    return created;
  }

  const [updated] = await db.update(release_dsp_status)
    .set({
      status:       input.status,
      url:          input.url          ?? existing.url,
      submitted_at: input.submitted_at ? new Date(input.submitted_at) : existing.submitted_at,
      live_at:      input.live_at      ? new Date(input.live_at)      : existing.live_at,
      notes:        input.notes        ?? existing.notes,
      updated_at:   new Date(),
    })
    .where(and(eq(release_dsp_status.release_id, releaseId), eq(release_dsp_status.platform, platform)))
    .returning();

  return updated;
};

// ─── Campaigns ────────────────────────────────────────────────────────────────

export const getCampaigns = async (releaseId: string) => {
  const [release] = await db.select({ id: releases.id }).from(releases)
    .where(eq(releases.id, releaseId)).limit(1);
  if (!release) throw new AppError('Release not found', 404);

  return db.select().from(release_campaigns)
    .where(eq(release_campaigns.release_id, releaseId)).orderBy(asc(release_campaigns.campaign_type));
};

export const createCampaign = async (releaseId: string, input: CreateCampaignInput) => {
  const [release] = await db.select().from(releases).where(eq(releases.id, releaseId)).limit(1);
  if (!release) throw new AppError('Release not found', 404);

  const [campaign] = await db.insert(release_campaigns).values({
    release_id:    releaseId,
    artist_id:     release.artist_id ?? undefined,
    campaign_type: input.campaign_type,
    title:         input.title,
    status:        input.status ?? 'planned',
    target_date:   input.target_date ?? undefined,
    budget:        input.budget ? String(input.budget) : undefined,
    currency:      input.currency ?? 'USD',
    notes:         input.notes ?? undefined,
    metadata:      input.metadata ?? undefined,
  }).returning();

  if (campaign.status === 'active') {
    await onCampaignStarted(
      campaign as unknown as Record<string, unknown>,
      release as unknown as Record<string, unknown>,
    );
  }

  logActivity({
    eventType:  'campaign_created',
    module:     'release-intelligence',
    entityType: 'release_campaign',
    entityId:   campaign.id,
    title:      `Campaign created: ${campaign.title}`,
    severity:   'info',
    metadata:   { release_id: releaseId, campaign_type: campaign.campaign_type },
  });

  return campaign;
};

export const updateCampaign = async (campaignId: string, input: UpdateCampaignInput) => {
  const [existing] = await db.select().from(release_campaigns)
    .where(eq(release_campaigns.id, campaignId)).limit(1);
  if (!existing) throw new AppError('Campaign not found', 404);

  const [updated] = await db.update(release_campaigns)
    .set({
      campaign_type: input.campaign_type ?? existing.campaign_type,
      title:         input.title         ?? existing.title,
      status:        input.status        ?? existing.status,
      target_date:   input.target_date   ?? existing.target_date,
      budget:        input.budget != null ? String(input.budget) : existing.budget,
      currency:      input.currency      ?? existing.currency,
      notes:         input.notes         ?? existing.notes,
      metadata:      input.metadata      ?? existing.metadata,
      updated_at:    new Date(),
    })
    .where(eq(release_campaigns.id, campaignId))
    .returning();

  const [release] = await db.select().from(releases).where(eq(releases.id, updated.release_id)).limit(1);

  if (input.status === 'active' && existing.status !== 'active' && release) {
    await onCampaignStarted(
      updated  as unknown as Record<string, unknown>,
      release  as unknown as Record<string, unknown>,
    );
  } else if (input.status === 'completed' && existing.status !== 'completed' && release) {
    await onCampaignCompleted(
      updated  as unknown as Record<string, unknown>,
      release  as unknown as Record<string, unknown>,
    );
  }

  return updated;
};

export const deleteCampaign = async (campaignId: string) => {
  const [deleted] = await db.delete(release_campaigns)
    .where(eq(release_campaigns.id, campaignId)).returning();
  if (!deleted) throw new AppError('Campaign not found', 404);
  return { deleted: true, id: campaignId };
};

// ─── Alerts ───────────────────────────────────────────────────────────────────

export const getAlerts = async (releaseId: string, includeResolved = false) => {
  const conditions = [eq(release_alerts.release_id, releaseId)];
  if (!includeResolved) conditions.push(eq(release_alerts.is_resolved, false));

  return db.select().from(release_alerts)
    .where(and(...conditions)).orderBy(desc(release_alerts.created_at));
};

export const generateAlerts = async (releaseId: string) => {
  const [release] = await db.select().from(releases).where(eq(releases.id, releaseId)).limit(1);
  if (!release) throw new AppError('Release not found', 404);

  const [checklist, dsps, campaigns] = await Promise.all([
    db.select().from(release_checklists)
      .where(eq(release_checklists.release_id, releaseId)).limit(1).then(r => r[0] ?? null),
    db.select().from(release_dsp_status).where(eq(release_dsp_status.release_id, releaseId)),
    db.select().from(release_campaigns).where(eq(release_campaigns.release_id, releaseId)),
  ]);

  const specs = generateAlertSpecs(release, checklist, dsps, campaigns);

  await db.delete(release_alerts)
    .where(and(eq(release_alerts.release_id, releaseId), eq(release_alerts.is_resolved, false)));

  if (specs.length === 0) return [];

  return db.insert(release_alerts)
    .values(specs.map(s => ({ release_id: releaseId, ...s })))
    .returning();
};

export const resolveAlert = async (alertId: string) => {
  const [updated] = await db.update(release_alerts)
    .set({ is_resolved: true, resolved_at: new Date() })
    .where(eq(release_alerts.id, alertId))
    .returning();
  if (!updated) throw new AppError('Alert not found', 404);
  return updated;
};

// ─── AI Recommendations ───────────────────────────────────────────────────────

export const getRecommendations = async (releaseId: string) => {
  return db.select().from(release_ai_recs)
    .where(eq(release_ai_recs.release_id, releaseId)).orderBy(asc(release_ai_recs.priority));
};

export const generateRecommendations = async (releaseId: string) => {
  const [release] = await db.select().from(releases).where(eq(releases.id, releaseId)).limit(1);
  if (!release) throw new AppError('Release not found', 404);

  const [checklist, dsps, campaigns, songCount] = await Promise.all([
    db.select().from(release_checklists)
      .where(eq(release_checklists.release_id, releaseId)).limit(1).then(r => r[0] ?? null),
    db.select().from(release_dsp_status).where(eq(release_dsp_status.release_id, releaseId)),
    db.select().from(release_campaigns).where(eq(release_campaigns.release_id, releaseId)),
    db.select({ id: songs.id }).from(songs).where(eq(songs.release_id, releaseId)).then(r => r.length),
  ]);

  const specs = generateRecSpecs(release, checklist, dsps, campaigns, songCount);

  await db.delete(release_ai_recs)
    .where(and(eq(release_ai_recs.release_id, releaseId), eq(release_ai_recs.is_actioned, false)));

  if (specs.length === 0) return [];

  return db.insert(release_ai_recs)
    .values(specs.map(s => ({ release_id: releaseId, ...s })))
    .returning();
};

export const actionRecommendation = async (recId: string) => {
  const [updated] = await db.update(release_ai_recs)
    .set({ is_actioned: true, actioned_at: new Date() })
    .where(eq(release_ai_recs.id, recId))
    .returning();
  if (!updated) throw new AppError('Recommendation not found', 404);
  return updated;
};

// ─── Readiness ────────────────────────────────────────────────────────────────

export const getReadiness = async (releaseId: string) => {
  const [release] = await db.select().from(releases).where(eq(releases.id, releaseId)).limit(1);
  if (!release) throw new AppError('Release not found', 404);

  const [checklist, dsps, campaigns] = await Promise.all([
    db.select().from(release_checklists)
      .where(eq(release_checklists.release_id, releaseId)).limit(1).then(r => r[0] ?? null),
    db.select().from(release_dsp_status).where(eq(release_dsp_status.release_id, releaseId)),
    db.select().from(release_campaigns).where(eq(release_campaigns.release_id, releaseId)),
  ]);

  const readiness = computeReadinessScore(checklist, dsps, campaigns);

  return {
    release_id:    releaseId,
    release_title: release.release_title,
    ...readiness,
    checklist_items: CHECKLIST_FIELDS.map(f => ({
      field: f,
      label: f.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
      ready: checklist ? Boolean(checklist[f]) : false,
    })),
    dsp_summary: {
      total:         DSP_PLATFORMS.length,
      live:          dsps.filter(d => d.status === 'live').length,
      submitted:     dsps.filter(d => d.status === 'submitted' || d.status === 'processing').length,
      not_submitted: dsps.filter(d => d.status === 'not_submitted').length,
      rejected:      dsps.filter(d => d.status === 'rejected').length,
    },
    campaign_summary: {
      total:     campaigns.length,
      active:    campaigns.filter(c => c.status === 'active').length,
      completed: campaigns.filter(c => c.status === 'completed').length,
      by_type:   ['marketing', 'playlist', 'blog', 'press', 'pre_save'].map(t => ({
        type:   t,
        exists: campaigns.some(c => c.campaign_type === t),
        status: campaigns.find(c => c.campaign_type === t)?.status ?? 'none',
      })),
    },
  };
};

// ─── Mission Control integration ──────────────────────────────────────────────

export const getReleaseIntelligenceSummary = async () => {
  const [totalAlerts, criticalAlerts, upcomingReleases] = await Promise.all([
    db.select({ id: release_alerts.id }).from(release_alerts)
      .where(eq(release_alerts.is_resolved, false)).then(r => r.length),
    db.select({ id: release_alerts.id }).from(release_alerts)
      .where(and(eq(release_alerts.is_resolved, false), eq(release_alerts.severity, 'critical')))
      .then(r => r.length),
    db.select({ id: releases.id, release_title: releases.release_title, release_date: releases.release_date })
      .from(releases)
      .where(and(
        eq(releases.music_status, 'scheduled'),
        gte(releases.release_date, new Date().toISOString().split('T')[0]),
      ))
      .orderBy(asc(releases.release_date))
      .limit(5),
  ]);

  return { total_alerts: totalAlerts, critical_alerts: criticalAlerts, upcoming_releases: upcomingReleases };
};

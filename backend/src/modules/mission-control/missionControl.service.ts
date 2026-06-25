import { db } from '../../db';
import { sql } from 'drizzle-orm';
import { getMissingMetadata } from '../catalog-engine/catalog-search.service';

export async function getMissionBrief() {
  const now = new Date();
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  const todayEnd = new Date(today);
  todayEnd.setHours(23, 59, 59, 999);
  const in7Days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const in30Days = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

  const [
    releasesResult,
    contractsResult,
    outreachResult,
    meetingsResult,
    paymentsResult,
    syncPitchesResult,
    dealsResult,
    automationResult,
    catalogMissingResult,
  ] = await Promise.allSettled([
    // Releases due in next 30 days or overdue
    db.execute(sql`
      SELECT id, title, release_type, release_date, status
      FROM releases
      WHERE release_date IS NOT NULL
        AND release_date <= ${in30Days.toISOString()}
      ORDER BY release_date ASC
      LIMIT 10
    `),
    // Contracts awaiting review
    db.execute(sql`
      SELECT id, title, status, company_name, value, expiry_date
      FROM contracts
      WHERE status IN ('draft','under_review','sent','awaiting_signature')
      ORDER BY created_at DESC
      LIMIT 10
    `),
    // Active outreach campaigns
    db.execute(sql`
      SELECT id, name, status, total_contacts, reply_count, meeting_count
      FROM outreach_campaigns
      WHERE status IN ('active','paused')
      ORDER BY created_at DESC
      LIMIT 10
    `),
    // Meetings scheduled today or upcoming 7 days
    db.execute(sql`
      SELECT id, title, status, scheduled_at, contact_name, company_name
      FROM meetings
      WHERE status IN ('scheduled','confirmed')
        AND scheduled_at >= ${today.toISOString()}
        AND scheduled_at <= ${in7Days.toISOString()}
      ORDER BY scheduled_at ASC
      LIMIT 10
    `),
    // Payments expected (pending/overdue)
    db.execute(sql`
      SELECT id, title, status, amount, currency, due_date, company_name
      FROM payments
      WHERE status IN ('pending','overdue','invoice_sent')
      ORDER BY due_date ASC
      LIMIT 10
    `),
    // High-priority sync pitches
    db.execute(sql`
      SELECT id, song_title, supervisor_name, company_name, status, score
      FROM sync_pitches
      WHERE status NOT IN ('rejected','archived')
      ORDER BY score DESC NULLS LAST, created_at DESC
      LIMIT 10
    `),
    // Open deals
    db.execute(sql`
      SELECT id, title, stage, deal_score, projected_value, company_name
      FROM deals
      WHERE status = 'open'
      ORDER BY deal_score DESC NULLS LAST
      LIMIT 10
    `),
    // Recent automation runs
    db.execute(sql`
      SELECT id, name, status, run_at, error_message
      FROM automation_runs
      ORDER BY run_at DESC
      LIMIT 20
    `),
    // Catalog missing metadata
    getMissingMetadata().catch(() => null),
  ]);

  const releases    = releasesResult.status    === 'fulfilled' ? ([...releasesResult.value]    as any[]) : [];
  const contracts   = contractsResult.status   === 'fulfilled' ? ([...contractsResult.value]   as any[]) : [];
  const outreach    = outreachResult.status    === 'fulfilled' ? ([...outreachResult.value]    as any[]) : [];
  const meetings    = meetingsResult.status    === 'fulfilled' ? ([...meetingsResult.value]    as any[]) : [];
  const payments    = paymentsResult.status    === 'fulfilled' ? ([...paymentsResult.value]    as any[]) : [];
  const syncPitches = syncPitchesResult.status === 'fulfilled' ? ([...syncPitchesResult.value] as any[]) : [];
  const dealsRows   = dealsResult.status       === 'fulfilled' ? ([...dealsResult.value]       as any[]) : [];
  const autoRuns    = automationResult.status  === 'fulfilled' ? ([...automationResult.value]  as any[]) : [];
  const catalogMissing = catalogMissingResult.status === 'fulfilled' ? catalogMissingResult.value : null;

  // ── Build Critical Actions ────────────────────────────────────────────────
  const releasesDue = releases.filter(r => {
    const rd = r.release_date ? new Date(r.release_date) : null;
    return rd && rd <= in7Days;
  });

  const contractsAwaitingReview = contracts.filter(c =>
    ['under_review','awaiting_signature','sent'].includes(c.status)
  );

  const outreachFollowups = outreach.filter(o => {
    const replyRate = o.total_contacts > 0
      ? (Number(o.reply_count) / Number(o.total_contacts))
      : 0;
    return o.status === 'active' && replyRate < 0.1;
  });

  const meetingsToday = meetings.filter(m => {
    const mt = m.scheduled_at ? new Date(m.scheduled_at) : null;
    return mt && mt >= today && mt <= todayEnd;
  });

  const paymentsExpected = payments.filter(p =>
    ['pending','overdue'].includes(p.status)
  );

  // ── Automation Stats ──────────────────────────────────────────────────────
  const totalRuns    = autoRuns.length;
  const successCount = autoRuns.filter(r => r.status === 'success').length;
  const failedCount  = autoRuns.filter(r => r.status === 'failed').length;
  const lastRun      = autoRuns[0] ?? null;
  const successRate  = totalRuns > 0 ? Math.round((successCount / totalRuns) * 100) : 0;

  // ── Risks ─────────────────────────────────────────────────────────────────
  const risks: Array<{ type: string; severity: 'critical'|'high'|'medium'; title: string; detail: string; href: string }> = [];

  // Overdue releases
  releases.filter(r => r.release_date && new Date(r.release_date) < now).forEach(r => {
    risks.push({ type: 'release', severity: 'high', title: `Overdue: ${r.title}`, detail: `Release date passed`, href: '/releases' });
  });

  // Expiring contracts
  contracts.filter(c => c.expiry_date && new Date(c.expiry_date) <= in30Days).forEach(c => {
    risks.push({ type: 'contract', severity: 'critical', title: `Contract expiring: ${c.title ?? 'Untitled'}`, detail: c.company_name ?? '', href: '/contract-intelligence' });
  });

  // Overdue payments
  payments.filter(p => p.status === 'overdue').forEach(p => {
    risks.push({ type: 'payment', severity: 'critical', title: `Overdue payment: ${p.title ?? p.company_name ?? 'Unknown'}`, detail: `${p.currency ?? 'USD'} ${p.amount ?? 0}`, href: '/payment-intelligence' });
  });

  // Inactive outreach
  outreach.filter(o => o.status === 'paused').forEach(o => {
    risks.push({ type: 'outreach', severity: 'medium', title: `Paused campaign: ${o.name}`, detail: `${o.total_contacts ?? 0} contacts reached`, href: '/outreach' });
  });

  // Failed automations
  autoRuns.filter(r => r.status === 'failed').slice(0, 3).forEach(r => {
    risks.push({ type: 'automation', severity: 'high', title: `Failed automation: ${r.name}`, detail: r.error_message ?? 'No details', href: '/automation-runs' });
  });

  // Catalog missing metadata risks
  if (catalogMissing) {
    if (catalogMissing.missing_isrc?.length > 0) {
      risks.push({ type: 'catalog', severity: 'high', title: `${catalogMissing.missing_isrc.length} song(s) missing ISRC`, detail: 'Required for distribution', href: '/catalog/songs' });
    }
    if (catalogMissing.missing_upc?.length > 0) {
      risks.push({ type: 'catalog', severity: 'high', title: `${catalogMissing.missing_upc.length} release(s) missing UPC`, detail: 'Required for distribution', href: '/catalog/releases' });
    }
    if (catalogMissing.missing_artwork?.length > 0) {
      risks.push({ type: 'catalog', severity: 'medium', title: `${catalogMissing.missing_artwork.length} release(s) missing artwork`, detail: 'Required for DSP submission', href: '/catalog/releases' });
    }
    if (catalogMissing.songs_without_releases?.length > 0) {
      risks.push({ type: 'catalog', severity: 'medium', title: `${catalogMissing.songs_without_releases.length} song(s) not linked to any release`, detail: 'Catalog incomplete', href: '/catalog/songs' });
    }
    if (catalogMissing.upcoming_releases?.length > 0) {
      catalogMissing.upcoming_releases.slice(0, 3).forEach((r: any) => {
        if (r.days_until <= 7) {
          risks.push({ type: 'catalog', severity: 'critical', title: `Release in ${r.days_until} day(s): ${r.title}`, detail: 'Final prep needed', href: '/catalog/releases' });
        }
      });
    }
  }

  // ── Opportunities ─────────────────────────────────────────────────────────
  const opportunities: Array<{ type: string; title: string; detail: string; score?: number; href: string }> = [];

  syncPitches.slice(0, 5).forEach(s => {
    opportunities.push({ type: 'sync', title: s.song_title ?? 'Sync opportunity', detail: `${s.supervisor_name ?? ''} · ${s.company_name ?? ''}`, score: s.score ? Number(s.score) : undefined, href: '/sync-pitches' });
  });

  dealsRows.slice(0, 5).forEach(d => {
    opportunities.push({ type: 'deal', title: d.title ?? 'Open deal', detail: `${d.stage ?? ''} · ${d.company_name ?? ''}`, score: d.deal_score ? Number(d.deal_score) * 100 : undefined, href: '/deal-intelligence' });
  });

  // ── Prioritised Actions (AI brief) ────────────────────────────────────────
  const actions: Array<{ priority: number; category: string; action: string; context: string; href: string }> = [];

  if (paymentsExpected.filter(p => p.status === 'overdue').length > 0) {
    actions.push({ priority: 1, category: 'PAYMENT', action: `Follow up on ${paymentsExpected.filter(p => p.status === 'overdue').length} overdue payment(s)`, context: 'Revenue at risk', href: '/payment-intelligence' });
  }
  if (contractsAwaitingReview.length > 0) {
    actions.push({ priority: 2, category: 'CONTRACT', action: `Review ${contractsAwaitingReview.length} pending contract(s)`, context: 'Awaiting signature or review', href: '/contract-intelligence' });
  }
  if (meetingsToday.length > 0) {
    actions.push({ priority: 3, category: 'MEETING', action: `Prepare for ${meetingsToday.length} meeting(s) today`, context: meetingsToday.map(m => m.title ?? m.contact_name ?? 'Meeting').join(', '), href: '/meeting-intelligence' });
  }
  if (releasesDue.length > 0) {
    actions.push({ priority: 4, category: 'RELEASE', action: `${releasesDue.length} release(s) due within 7 days`, context: releasesDue.map(r => r.title).join(', '), href: '/releases' });
  }
  if (outreachFollowups.length > 0) {
    actions.push({ priority: 5, category: 'OUTREACH', action: `${outreachFollowups.length} campaign(s) need follow-up`, context: 'Low reply rate detected', href: '/outreach' });
  }
  if (syncPitches.length > 0) {
    actions.push({ priority: 6, category: 'SYNC', action: `Review ${syncPitches.length} active sync pitch(es)`, context: 'Opportunities identified', href: '/sync-pitches' });
  }
  if (dealsRows.length > 0) {
    actions.push({ priority: 7, category: 'DEAL', action: `Advance ${dealsRows.length} open deal(s)`, context: 'Pipeline needs attention', href: '/deal-intelligence' });
  }
  if (catalogMissing && (catalogMissing.missing_isrc?.length ?? 0) > 0) {
    actions.push({ priority: 8, category: 'CATALOG', action: `Register ISRC for ${(catalogMissing.missing_isrc as any[]).length} song(s)`, context: 'Missing identifiers block distribution', href: '/catalog/songs' });
  }
  if (catalogMissing && (catalogMissing.missing_artwork?.length ?? 0) > 0) {
    actions.push({ priority: 9, category: 'CATALOG', action: `Upload artwork for ${(catalogMissing.missing_artwork as any[]).length} release(s)`, context: 'Required for DSP submission', href: '/catalog/releases' });
  }

  return {
    brief: {
      prioritizedActions: actions.slice(0, 7),
      topOpportunities: opportunities.slice(0, 8),
      urgentRisks: risks.slice(0, 8),
    },
    criticalActions: {
      releasesDue:              releasesDue.slice(0, 5),
      contractsAwaitingReview:  contractsAwaitingReview.slice(0, 5),
      outreachFollowups:        outreachFollowups.slice(0, 5),
      meetingsToday:            meetingsToday.slice(0, 5),
      paymentsExpected:         paymentsExpected.slice(0, 5),
    },
    opportunityFeed: {
      syncOpportunities: syncPitches.slice(0, 8),
      openDeals:         dealsRows.slice(0, 8),
    },
    automationStatus: {
      totalRuns,
      successCount,
      failedCount,
      lastRun: lastRun ? { name: lastRun.name, status: lastRun.status, runAt: lastRun.run_at } : null,
      successRate,
      queueHealth: failedCount > totalRuns * 0.3 ? 'degraded' : failedCount > 0 ? 'warning' : 'healthy',
    },
    risks,
    releases: releases.slice(0, 8),
    catalogAlerts: catalogMissing ? {
      missing_isrc:            (catalogMissing.missing_isrc ?? []).slice(0, 10),
      missing_upc:             (catalogMissing.missing_upc ?? []).slice(0, 10),
      missing_artwork:         (catalogMissing.missing_artwork ?? []).slice(0, 10),
      songs_without_releases:  (catalogMissing.songs_without_releases ?? []).slice(0, 10),
      incomplete_credits:      (catalogMissing.incomplete_credits ?? []).slice(0, 10),
      upcoming_releases:       (catalogMissing.upcoming_releases ?? []).slice(0, 5),
    } : null,
  };
}

export async function getGlobalSearch(query: string, limit = 20) {
  const q = `%${query.toLowerCase()}%`;
  const results: Array<{ type: string; id: string; title: string; subtitle: string; href: string }> = [];

  const searches = await Promise.allSettled([
    db.execute(sql`SELECT id, stage_name as title, COALESCE(legal_name,'') as subtitle FROM artist_profiles WHERE LOWER(stage_name) LIKE ${q} LIMIT 5`),
    db.execute(sql`SELECT id, title, release_type as subtitle FROM releases WHERE LOWER(title) LIKE ${q} LIMIT 5`),
    db.execute(sql`SELECT id, title, COALESCE(company_name,'') as subtitle FROM contracts WHERE LOWER(title) LIKE ${q} LIMIT 5`),
    db.execute(sql`SELECT id, name as title, status as subtitle FROM outreach_campaigns WHERE LOWER(name) LIKE ${q} LIMIT 5`),
    db.execute(sql`SELECT id, COALESCE(song_title,'Sync Opportunity') as title, COALESCE(supervisor_name,'') as subtitle FROM sync_pitches WHERE LOWER(COALESCE(song_title,'')) LIKE ${q} LIMIT 5`),
    db.execute(sql`SELECT id, COALESCE(title, company_name, 'Payment') as title, COALESCE(company_name,'') as subtitle FROM payments WHERE LOWER(COALESCE(title,'')) LIKE ${q} OR LOWER(COALESCE(company_name,'')) LIKE ${q} LIMIT 5`),
  ]);

  const types  = ['artist', 'release', 'contract', 'campaign', 'sync', 'payment'];
  const hrefs  = ['/artists', '/releases', '/contract-intelligence', '/outreach', '/sync-pitches', '/payment-intelligence'];

  searches.forEach((res, i) => {
    if (res.status === 'fulfilled') {
      ([...res.value] as any[]).forEach(row => {
        results.push({ type: types[i], id: String(row.id), title: String(row.title ?? ''), subtitle: String(row.subtitle ?? ''), href: hrefs[i] });
      });
    }
  });

  return results.slice(0, limit);
}

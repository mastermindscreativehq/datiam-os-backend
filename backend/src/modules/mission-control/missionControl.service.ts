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
      SELECT id, release_title as title, release_type, release_date, status
      FROM releases
      WHERE release_date IS NOT NULL
        AND release_date <= ${in30Days.toISOString()}
      ORDER BY release_date ASC
      LIMIT 10
    `),
    // Contracts awaiting review (drafted/generated/sent/viewed — not yet signed/expired/cancelled)
    db.execute(sql`
      SELECT c.id, c.contract_title as title, c.status, co.name as company_name, c.contract_value as value, c.expires_at as expiry_date
      FROM contracts c
      LEFT JOIN companies co ON co.id = c.company_id
      WHERE c.status IN ('draft','generated','sent','viewed')
      ORDER BY c.created_at DESC
      LIMIT 10
    `),
    // In-flight outreach campaigns (queued/sent, awaiting a reply)
    db.execute(sql`
      SELECT id, status, territory, created_at
      FROM outreach_campaign
      WHERE status IN ('queued','sent')
      ORDER BY created_at DESC
      LIMIT 10
    `),
    // Meetings scheduled today or upcoming 7 days
    db.execute(sql`
      SELECT m.id, m.meeting_title as title, m.status, m.scheduled_at, lc.full_name as contact_name
      FROM meetings m
      LEFT JOIN licensing_contacts lc ON lc.id = m.contact_id
      WHERE m.status IN ('scheduled','confirmed')
        AND m.scheduled_at >= ${today.toISOString()}
        AND m.scheduled_at <= ${in7Days.toISOString()}
      ORDER BY m.scheduled_at ASC
      LIMIT 10
    `),
    // Payments expected (pending/overdue)
    db.execute(sql`
      SELECT p.id, p.invoice_number as title, p.payment_status as status, p.payment_amount as amount, p.currency, p.due_date, co.name as company_name
      FROM payments p
      LEFT JOIN companies co ON co.id = p.company_id
      WHERE p.payment_status IN ('pending','overdue','invoice_sent')
      ORDER BY p.due_date ASC
      LIMIT 10
    `),
    // High-priority sync/licensing placement opportunities
    db.execute(sql`
      SELECT po.id, po.title, lc.full_name as supervisor_name, co.name as company_name, po.status, po.ai_sync_score as score
      FROM placement_opportunities po
      LEFT JOIN companies co ON co.id = po.company_id
      LEFT JOIN licensing_contacts lc ON lc.id = po.contact_id
      WHERE po.status NOT IN ('rejected','withdrawn','expired')
        AND po.deleted_at IS NULL
      ORDER BY po.ai_sync_score DESC NULLS LAST, po.created_at DESC
      LIMIT 10
    `),
    // Open deals
    db.execute(sql`
      SELECT d.id, d.deal_name as title, d.stage, d.deal_score, d.projected_value, co.name as company_name
      FROM deals d
      LEFT JOIN companies co ON co.id = d.company_id
      WHERE d.status = 'open'
      ORDER BY d.deal_score DESC NULLS LAST
      LIMIT 10
    `),
    // Recent automation runs
    db.execute(sql`
      SELECT id, workflow_name, status, created_at, error_message
      FROM automation_runs
      ORDER BY created_at DESC
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
    ['draft','generated','sent','viewed'].includes(c.status)
  );

  // Pitched but not yet replied — worth a follow-up nudge
  const outreachFollowups = outreach.filter(o => o.status === 'sent');

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

  // Outreach awaiting a reply
  outreachFollowups.forEach(o => {
    risks.push({ type: 'outreach', severity: 'medium', title: `Awaiting reply: ${o.territory ?? 'campaign'}`, detail: 'Pitched, no reply yet', href: '/outreach' });
  });

  // Failed automations
  autoRuns.filter(r => r.status === 'failed').slice(0, 3).forEach(r => {
    risks.push({ type: 'automation', severity: 'high', title: `Failed automation: ${r.workflow_name}`, detail: r.error_message ?? 'No details', href: '/automation-runs' });
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
    opportunities.push({ type: 'sync', title: s.title ?? 'Sync opportunity', detail: `${s.supervisor_name ?? ''} · ${s.company_name ?? ''}`, score: s.score ? Number(s.score) : undefined, href: '/sync-pitches' });
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
    actions.push({ priority: 5, category: 'OUTREACH', action: `${outreachFollowups.length} campaign(s) need follow-up`, context: 'Pitched, awaiting reply', href: '/outreach' });
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
      lastRun: lastRun ? { name: lastRun.workflow_name, status: lastRun.status, runAt: lastRun.created_at } : null,
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
    db.execute(sql`SELECT id, release_title as title, release_type as subtitle FROM releases WHERE LOWER(release_title) LIKE ${q} LIMIT 5`),
    db.execute(sql`
      SELECT c.id, c.contract_title as title, COALESCE(co.name,'') as subtitle
      FROM contracts c
      LEFT JOIN companies co ON co.id = c.company_id
      WHERE LOWER(c.contract_title) LIKE ${q} LIMIT 5
    `),
    db.execute(sql`SELECT id, COALESCE(territory,'Outreach') as title, status as subtitle FROM outreach_campaign WHERE LOWER(COALESCE(territory,'')) LIKE ${q} OR LOWER(COALESCE(notes,'')) LIKE ${q} LIMIT 5`),
    db.execute(sql`
      SELECT po.id, po.title, COALESCE(lc.full_name,'') as subtitle
      FROM placement_opportunities po
      LEFT JOIN licensing_contacts lc ON lc.id = po.contact_id
      WHERE LOWER(po.title) LIKE ${q} AND po.deleted_at IS NULL LIMIT 5
    `),
    db.execute(sql`
      SELECT p.id, COALESCE(co.name, p.invoice_number, 'Payment') as title, COALESCE(co.name,'') as subtitle
      FROM payments p
      LEFT JOIN companies co ON co.id = p.company_id
      WHERE LOWER(p.invoice_number) LIKE ${q} OR LOWER(COALESCE(co.name,'')) LIKE ${q} LIMIT 5
    `),
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

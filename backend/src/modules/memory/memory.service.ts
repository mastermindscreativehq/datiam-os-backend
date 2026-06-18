import { eq, sql } from 'drizzle-orm';
import { db } from '../../db';
import {
  company_memory,
  contact_memory,
  artist_sync_memory,
} from '../../db/schema';
import { AppError } from '../../middleware/errorHandler';

// ── rebuild helpers ────────────────────────────────────────────────────────────

async function rebuildArtistSyncMemory(): Promise<number> {
  await db.execute(sql`
    INSERT INTO artist_sync_memory (
      artist_id,
      opportunities_submitted,
      placements_won,
      total_sync_revenue,
      strongest_genres,
      strongest_moods,
      strongest_territories,
      strongest_bpm_ranges,
      success_rate,
      memory_updated_at
    )
    SELECT
      a.artist_id,
      a.opportunities_submitted,
      a.placements_won,
      a.total_sync_revenue,
      COALESCE(g.genres, '[]'::jsonb),
      COALESCE(m.moods, '[]'::jsonb),
      COALESCE(t.territories, '[]'::jsonb),
      COALESCE(b.bpm_ranges, '[]'::jsonb),
      CASE WHEN a.opportunities_submitted > 0
        THEN ROUND(a.placements_won::numeric / a.opportunities_submitted, 4)
        ELSE 0
      END,
      now()
    FROM (
      SELECT
        po.artist_id,
        COUNT(DISTINCT po.id)::int                                                                 AS opportunities_submitted,
        COUNT(DISTINCT CASE WHEN out.outcome = 'placed' THEN out.id END)::int                      AS placements_won,
        COALESCE(SUM(CASE WHEN out.outcome = 'placed'
          THEN COALESCE(out.final_fee_usd::numeric, 0) + COALESCE(out.royalties_collected_usd::numeric, 0)
          ELSE 0 END), 0)                                                                           AS total_sync_revenue
      FROM placement_opportunities po
      LEFT JOIN placement_outcomes out ON out.opportunity_id = po.id
      GROUP BY po.artist_id
    ) a
    LEFT JOIN LATERAL (
      SELECT jsonb_agg(genre ORDER BY cnt DESC) AS genres
      FROM (
        SELECT s.genre, COUNT(*) AS cnt
        FROM placement_opportunities po2
        JOIN songs s ON s.id = po2.song_id
        JOIN placement_outcomes out2 ON out2.opportunity_id = po2.id AND out2.outcome = 'placed'
        WHERE po2.artist_id = a.artist_id AND s.genre IS NOT NULL
        GROUP BY s.genre
        ORDER BY cnt DESC
        LIMIT 5
      ) _g
    ) g ON true
    LEFT JOIN LATERAL (
      SELECT jsonb_agg(mood ORDER BY cnt DESC) AS moods
      FROM (
        SELECT s.mood, COUNT(*) AS cnt
        FROM placement_opportunities po2
        JOIN songs s ON s.id = po2.song_id
        JOIN placement_outcomes out2 ON out2.opportunity_id = po2.id AND out2.outcome = 'placed'
        WHERE po2.artist_id = a.artist_id AND s.mood IS NOT NULL
        GROUP BY s.mood
        ORDER BY cnt DESC
        LIMIT 5
      ) _m
    ) m ON true
    LEFT JOIN LATERAL (
      SELECT jsonb_agg(territory ORDER BY cnt DESC) AS territories
      FROM (
        SELECT out2.territory, COUNT(*) AS cnt
        FROM placement_opportunities po2
        JOIN placement_outcomes out2 ON out2.opportunity_id = po2.id AND out2.outcome = 'placed'
        WHERE po2.artist_id = a.artist_id AND out2.territory IS NOT NULL
        GROUP BY out2.territory
        ORDER BY cnt DESC
        LIMIT 5
      ) _t
    ) t ON true
    LEFT JOIN LATERAL (
      SELECT jsonb_agg(bpm_range ORDER BY cnt DESC) AS bpm_ranges
      FROM (
        SELECT
          CASE
            WHEN s.bpm < 80  THEN 'slow (<80)'
            WHEN s.bpm < 100 THEN 'medium-slow (80-99)'
            WHEN s.bpm < 120 THEN 'medium (100-119)'
            WHEN s.bpm < 140 THEN 'medium-fast (120-139)'
            ELSE                   'fast (140+)'
          END AS bpm_range,
          COUNT(*) AS cnt
        FROM placement_opportunities po2
        JOIN songs s ON s.id = po2.song_id
        JOIN placement_outcomes out2 ON out2.opportunity_id = po2.id AND out2.outcome = 'placed'
        WHERE po2.artist_id = a.artist_id AND s.bpm IS NOT NULL
        GROUP BY bpm_range
        ORDER BY cnt DESC
        LIMIT 5
      ) _b
    ) b ON true
    ON CONFLICT (artist_id) DO UPDATE SET
      opportunities_submitted = EXCLUDED.opportunities_submitted,
      placements_won          = EXCLUDED.placements_won,
      total_sync_revenue      = EXCLUDED.total_sync_revenue,
      strongest_genres        = EXCLUDED.strongest_genres,
      strongest_moods         = EXCLUDED.strongest_moods,
      strongest_territories   = EXCLUDED.strongest_territories,
      strongest_bpm_ranges    = EXCLUDED.strongest_bpm_ranges,
      success_rate            = EXCLUDED.success_rate,
      memory_updated_at       = EXCLUDED.memory_updated_at
  `);

  const [{ n }] = await db.execute<{ n: string }>(
    sql`SELECT COUNT(*)::int AS n FROM artist_sync_memory`,
  );
  return Number(n);
}

async function rebuildCompanyMemory(): Promise<number> {
  await db.execute(sql`
    INSERT INTO company_memory (
      company_id,
      total_opportunities,
      total_placements,
      total_revenue,
      avg_deal_size,
      preferred_genres,
      preferred_bpm_ranges,
      preferred_moods,
      preferred_license_types,
      response_rate,
      placement_rate,
      last_contacted_at,
      memory_updated_at
    )
    SELECT
      c.company_id,
      c.total_opps,
      c.total_placed,
      c.total_revenue,
      CASE WHEN c.total_placed > 0
        THEN ROUND(c.total_revenue / c.total_placed, 2)
        ELSE 0
      END,
      COALESCE(g.genres,        '[]'::jsonb),
      COALESCE(b.bpm_ranges,    '[]'::jsonb),
      COALESCE(m.moods,         '[]'::jsonb),
      COALESCE(l.license_types, '[]'::jsonb),
      CASE WHEN c.total_opps > 0
        THEN ROUND(c.with_outcome::numeric / c.total_opps, 4)
        ELSE 0
      END,
      CASE WHEN c.total_opps > 0
        THEN ROUND(c.total_placed::numeric / c.total_opps, 4)
        ELSE 0
      END,
      c.last_contacted_at,
      now()
    FROM (
      SELECT
        po.company_id,
        COUNT(DISTINCT po.id)::int                                                                        AS total_opps,
        COUNT(DISTINCT out.id)::int                                                                       AS with_outcome,
        COUNT(DISTINCT CASE WHEN out.outcome = 'placed' THEN out.id END)::int                            AS total_placed,
        COALESCE(SUM(CASE WHEN out.outcome = 'placed'
          THEN COALESCE(out.final_fee_usd::numeric, 0) ELSE 0 END), 0)                                   AS total_revenue,
        MAX(lc.last_contacted_at)                                                                         AS last_contacted_at
      FROM placement_opportunities po
      LEFT JOIN placement_outcomes  out ON out.opportunity_id = po.id
      LEFT JOIN licensing_contacts  lc  ON lc.company_id = po.company_id
      WHERE po.company_id IS NOT NULL
      GROUP BY po.company_id
    ) c
    LEFT JOIN LATERAL (
      SELECT jsonb_agg(genre ORDER BY cnt DESC) AS genres
      FROM (
        SELECT s.genre, COUNT(*) AS cnt
        FROM placement_opportunities po2
        JOIN songs s ON s.id = po2.song_id
        WHERE po2.company_id = c.company_id AND s.genre IS NOT NULL
        GROUP BY s.genre ORDER BY cnt DESC LIMIT 5
      ) _g
    ) g ON true
    LEFT JOIN LATERAL (
      SELECT jsonb_agg(bpm_range ORDER BY cnt DESC) AS bpm_ranges
      FROM (
        SELECT
          CASE
            WHEN s.bpm < 80  THEN 'slow (<80)'
            WHEN s.bpm < 100 THEN 'medium-slow (80-99)'
            WHEN s.bpm < 120 THEN 'medium (100-119)'
            WHEN s.bpm < 140 THEN 'medium-fast (120-139)'
            ELSE                   'fast (140+)'
          END AS bpm_range,
          COUNT(*) AS cnt
        FROM placement_opportunities po2
        JOIN songs s ON s.id = po2.song_id
        WHERE po2.company_id = c.company_id AND s.bpm IS NOT NULL
        GROUP BY bpm_range ORDER BY cnt DESC LIMIT 5
      ) _b
    ) b ON true
    LEFT JOIN LATERAL (
      SELECT jsonb_agg(mood ORDER BY cnt DESC) AS moods
      FROM (
        SELECT s.mood, COUNT(*) AS cnt
        FROM placement_opportunities po2
        JOIN songs s ON s.id = po2.song_id
        WHERE po2.company_id = c.company_id AND s.mood IS NOT NULL
        GROUP BY s.mood ORDER BY cnt DESC LIMIT 5
      ) _m
    ) m ON true
    LEFT JOIN LATERAL (
      SELECT jsonb_agg(license_type::text ORDER BY cnt DESC) AS license_types
      FROM (
        SELECT po2.license_type, COUNT(*) AS cnt
        FROM placement_opportunities po2
        WHERE po2.company_id = c.company_id
        GROUP BY po2.license_type ORDER BY cnt DESC LIMIT 5
      ) _l
    ) l ON true
    ON CONFLICT (company_id) DO UPDATE SET
      total_opportunities     = EXCLUDED.total_opportunities,
      total_placements        = EXCLUDED.total_placements,
      total_revenue           = EXCLUDED.total_revenue,
      avg_deal_size           = EXCLUDED.avg_deal_size,
      preferred_genres        = EXCLUDED.preferred_genres,
      preferred_bpm_ranges    = EXCLUDED.preferred_bpm_ranges,
      preferred_moods         = EXCLUDED.preferred_moods,
      preferred_license_types = EXCLUDED.preferred_license_types,
      response_rate           = EXCLUDED.response_rate,
      placement_rate          = EXCLUDED.placement_rate,
      last_contacted_at       = EXCLUDED.last_contacted_at,
      memory_updated_at       = EXCLUDED.memory_updated_at
  `);

  const [{ n }] = await db.execute<{ n: string }>(
    sql`SELECT COUNT(*)::int AS n FROM company_memory`,
  );
  return Number(n);
}

async function rebuildContactMemory(): Promise<number> {
  await db.execute(sql`
    INSERT INTO contact_memory (
      contact_id,
      opportunities_seen,
      placements_closed,
      avg_response_time_days,
      preferred_genres,
      preferred_license_types,
      relationship_strength,
      success_rate,
      notes_summary,
      memory_updated_at
    )
    SELECT
      c.contact_id,
      c.opportunities_seen,
      c.placements_closed,
      c.avg_response_time_days,
      COALESCE(g.genres,        '[]'::jsonb),
      COALESCE(l.license_types, '[]'::jsonb),
      COALESCE(ROUND(lc.relationship_score::numeric / 10.0, 2), 0),
      CASE WHEN c.opportunities_seen > 0
        THEN ROUND(c.placements_closed::numeric / c.opportunities_seen, 4)
        ELSE 0
      END,
      lc.notes,
      now()
    FROM (
      SELECT
        po.contact_id,
        COUNT(DISTINCT po.id)::int                                                                AS opportunities_seen,
        COUNT(DISTINCT CASE WHEN out.outcome = 'placed' THEN out.id END)::int                    AS placements_closed,
        AVG(EXTRACT(EPOCH FROM (out.created_at - po.pitched_at)) / 86400.0)                      AS avg_response_time_days
      FROM placement_opportunities po
      LEFT JOIN placement_outcomes out ON out.opportunity_id = po.id
      WHERE po.contact_id IS NOT NULL
      GROUP BY po.contact_id
    ) c
    JOIN licensing_contacts lc ON lc.id = c.contact_id
    LEFT JOIN LATERAL (
      SELECT jsonb_agg(genre ORDER BY cnt DESC) AS genres
      FROM (
        SELECT s.genre, COUNT(*) AS cnt
        FROM placement_opportunities po2
        JOIN songs s ON s.id = po2.song_id
        WHERE po2.contact_id = c.contact_id AND s.genre IS NOT NULL
        GROUP BY s.genre ORDER BY cnt DESC LIMIT 5
      ) _g
    ) g ON true
    LEFT JOIN LATERAL (
      SELECT jsonb_agg(license_type::text ORDER BY cnt DESC) AS license_types
      FROM (
        SELECT po2.license_type, COUNT(*) AS cnt
        FROM placement_opportunities po2
        WHERE po2.contact_id = c.contact_id
        GROUP BY po2.license_type ORDER BY cnt DESC LIMIT 5
      ) _l
    ) l ON true
    ON CONFLICT (contact_id) DO UPDATE SET
      opportunities_seen      = EXCLUDED.opportunities_seen,
      placements_closed       = EXCLUDED.placements_closed,
      avg_response_time_days  = EXCLUDED.avg_response_time_days,
      preferred_genres        = EXCLUDED.preferred_genres,
      preferred_license_types = EXCLUDED.preferred_license_types,
      relationship_strength   = EXCLUDED.relationship_strength,
      success_rate            = EXCLUDED.success_rate,
      notes_summary           = EXCLUDED.notes_summary,
      memory_updated_at       = EXCLUDED.memory_updated_at
  `);

  const [{ n }] = await db.execute<{ n: string }>(
    sql`SELECT COUNT(*)::int AS n FROM contact_memory`,
  );
  return Number(n);
}

// ── public API ─────────────────────────────────────────────────────────────────

export const rebuildAllMemory = async () => {
  const [artistRows, companyRows, contactRows] = await Promise.all([
    rebuildArtistSyncMemory(),
    rebuildCompanyMemory(),
    rebuildContactMemory(),
  ]);
  return {
    artist_sync_memory:  artistRows,
    company_memory:      companyRows,
    contact_memory:      contactRows,
    rebuilt_at:          new Date().toISOString(),
  };
};

export const getCompanyMemory = async (companyId: string) => {
  const [row] = await db
    .select()
    .from(company_memory)
    .where(eq(company_memory.company_id, companyId));
  if (!row) throw new AppError('No memory record found for this company', 404);
  return row;
};

export const getContactMemory = async (contactId: string) => {
  const [row] = await db
    .select()
    .from(contact_memory)
    .where(eq(contact_memory.contact_id, contactId));
  if (!row) throw new AppError('No memory record found for this contact', 404);
  return row;
};

export const getArtistMemory = async (artistId: string) => {
  const [row] = await db
    .select()
    .from(artist_sync_memory)
    .where(eq(artist_sync_memory.artist_id, artistId));
  if (!row) throw new AppError('No memory record found for this artist', 404);
  return row;
};

-- DATIAM OS — Phase 7a: backfill ISRC/UPC into distribution_identifiers
-- Migration 0058
--
-- Purpose: populate the now-constrained `distribution_identifiers` table
-- (migration 0057) from the three legacy sources so Distribution has a
-- complete, canonical picture before any code starts reading from it
-- (that read cutover is Phase 7c, a later migration-free code change).
-- Idempotent throughout: every INSERT is NOT-EXISTS-guarded, safe to re-run.
-- None of the legacy sources (`songs.isrc`, `releases.upc`,
-- `releases.primary_isrc`, `catalog_identifiers`) are dropped or altered —
-- they remain the dual-write/rollback fallback until Phase 7d.
--
-- Steps:
--   1. songs.isrc              -> distribution_identifiers (song-scoped isrc)
--   2. releases.upc            -> distribution_identifiers (release-scoped upc)
--   3. releases.primary_isrc   -> mark is_lead=true on the matching song's
--                                 own isrc row (found via songs.release_id or
--                                 catalog_tracks) — NOT a duplicated value,
--                                 just a flag on the row step 1 already made.
--   4. releases.primary_isrc with no matching song -> a release-scoped
--                                 (song_id NULL) lead-isrc row, so the value
--                                 is never silently dropped even when it
--                                 can't be attributed to a specific song.
--   5. catalog_identifiers     -> anything not already covered above:
--        5a. isrc rows with a song_id, deduped to most-recent-per-song
--            (the new UNIQUE(song_id) WHERE type='isrc' constraint requires
--            at most one row per song within this single INSERT too).
--        5b. upc rows with a release_id, deduped to most-recent-per-release.
--        5c. everything else (iswc/catalog_number, or isrc/upc rows with
--            neither song_id nor release_id) — no uniqueness constraint
--            applies to these, copied as-is.
--
-- Conflict policy (documented, not silently arbitrary): if `catalog_identifiers`
-- ever holds a DIFFERENT isrc/upc value than what's already been backfilled
-- from the scalar `songs.isrc`/`releases.upc` columns for the same
-- song/release, step 5's NOT-EXISTS guard keeps the scalar-column-derived
-- value and skips the catalog_identifiers row (scalar columns are what every
-- existing read path has been serving as truth up to this point, so they win
-- ties). Verified empirically empty in every environment checked at the time
-- this migration was written (0 rows in catalog_identifiers, 0 non-null
-- values in songs.isrc/releases.upc/releases.primary_isrc) — re-verify this
-- assumption against production before relying on "no real conflicts exist"
-- if this migration is ever run against a database with real data.
--
-- Rollback:
--   DELETE FROM distribution_identifiers WHERE assigned_by = 'system:phase7-backfill';
--   -- Note: step 3's lead-marking UPDATE touches rows created by step 1
--   -- (also tagged 'system:phase7-backfill'), so the DELETE above removes
--   -- those too. If step 1's row was NOT a backfill row (e.g. a real row
--   -- created by application code between migrations), this rollback will
--   -- not un-set its release_id/is_lead — reset manually in that case:
--   --   UPDATE distribution_identifiers SET release_id = NULL, is_lead = false
--   --   WHERE is_lead = true AND assigned_by <> 'system:phase7-backfill';

-- ── 1. songs.isrc -> distribution_identifiers ────────────────────────────────
INSERT INTO distribution_identifiers (song_id, identifier_type, value, assigned_by, assigned_at)
SELECT s.id, 'isrc', s.isrc, 'system:phase7-backfill', s.updated_at
FROM songs s
WHERE s.isrc IS NOT NULL AND s.isrc <> ''
  AND NOT EXISTS (
    SELECT 1 FROM distribution_identifiers di WHERE di.song_id = s.id AND di.identifier_type = 'isrc'
  );
--> statement-breakpoint

-- ── 2. releases.upc -> distribution_identifiers ──────────────────────────────
INSERT INTO distribution_identifiers (release_id, identifier_type, value, assigned_by, assigned_at)
SELECT r.id, 'upc', r.upc, 'system:phase7-backfill', r.updated_at
FROM releases r
WHERE r.upc IS NOT NULL AND r.upc <> ''
  AND NOT EXISTS (
    SELECT 1 FROM distribution_identifiers di WHERE di.release_id = r.id AND di.identifier_type = 'upc'
  );
--> statement-breakpoint

-- ── 3. releases.primary_isrc -> flag the matching song's isrc row as lead ──
UPDATE distribution_identifiers di
SET release_id = matched.release_id, is_lead = true, updated_at = now()
FROM (
  SELECT DISTINCT ON (r.id) r.id AS release_id, s.id AS song_id
  FROM releases r
  JOIN songs s ON s.isrc = r.primary_isrc AND (
    s.release_id = r.id
    OR EXISTS (SELECT 1 FROM catalog_tracks ct WHERE ct.release_id = r.id AND ct.song_id = s.id)
  )
  WHERE r.primary_isrc IS NOT NULL AND r.primary_isrc <> ''
    AND NOT EXISTS (
      SELECT 1 FROM distribution_identifiers lead
      WHERE lead.release_id = r.id AND lead.identifier_type = 'isrc' AND lead.is_lead = true
    )
  ORDER BY r.id, s.id
) matched
WHERE di.song_id = matched.song_id AND di.identifier_type = 'isrc';
--> statement-breakpoint

-- ── 4. releases.primary_isrc with no matching song -> release-scoped lead row ──
INSERT INTO distribution_identifiers (release_id, identifier_type, value, is_lead, assigned_by, assigned_at)
SELECT r.id, 'isrc', r.primary_isrc, true, 'system:phase7-backfill', r.updated_at
FROM releases r
WHERE r.primary_isrc IS NOT NULL AND r.primary_isrc <> ''
  AND NOT EXISTS (
    SELECT 1 FROM distribution_identifiers lead
    WHERE lead.release_id = r.id AND lead.identifier_type = 'isrc' AND lead.is_lead = true
  );
--> statement-breakpoint

-- ── 5a. catalog_identifiers (isrc, song-scoped) -> distribution_identifiers ──
INSERT INTO distribution_identifiers (song_id, identifier_type, value, assigned_by, assigned_at, created_at)
SELECT DISTINCT ON (ci.song_id) ci.song_id, 'isrc', ci.value, COALESCE(ci.assigned_by, 'system:phase7-backfill'), ci.assigned_at, ci.created_at
FROM catalog_identifiers ci
WHERE ci.identifier_type = 'isrc' AND ci.song_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM distribution_identifiers di WHERE di.song_id = ci.song_id AND di.identifier_type = 'isrc'
  )
ORDER BY ci.song_id, ci.created_at DESC;
--> statement-breakpoint

-- ── 5b. catalog_identifiers (upc, release-scoped) -> distribution_identifiers ──
INSERT INTO distribution_identifiers (release_id, identifier_type, value, assigned_by, assigned_at, created_at)
SELECT DISTINCT ON (ci.release_id) ci.release_id, 'upc', ci.value, COALESCE(ci.assigned_by, 'system:phase7-backfill'), ci.assigned_at, ci.created_at
FROM catalog_identifiers ci
WHERE ci.identifier_type = 'upc' AND ci.release_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM distribution_identifiers di WHERE di.release_id = ci.release_id AND di.identifier_type = 'upc'
  )
ORDER BY ci.release_id, ci.created_at DESC;
--> statement-breakpoint

-- ── 5c. catalog_identifiers (everything else: iswc/catalog_number, or ─────────
--        isrc/upc rows with neither song_id nor release_id) — unconstrained,
--        copied as-is ──────────────────────────────────────────────────────
INSERT INTO distribution_identifiers (song_id, release_id, identifier_type, value, assigned_by, assigned_at, created_at)
SELECT ci.song_id, ci.release_id, ci.identifier_type, ci.value, COALESCE(ci.assigned_by, 'system:phase7-backfill'), ci.assigned_at, ci.created_at
FROM catalog_identifiers ci
WHERE NOT (ci.identifier_type = 'isrc' AND ci.song_id IS NOT NULL)
  AND NOT (ci.identifier_type = 'upc' AND ci.release_id IS NOT NULL)
  AND NOT EXISTS (
    SELECT 1 FROM distribution_identifiers di
    WHERE COALESCE(di.song_id::text, '') = COALESCE(ci.song_id::text, '')
      AND COALESCE(di.release_id::text, '') = COALESCE(ci.release_id::text, '')
      AND di.identifier_type = ci.identifier_type
      AND di.value = ci.value
  );

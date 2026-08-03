-- DATIAM OS — Phase 3b: Consolidate release_campaigns into campaigns
-- Migration 0056
--
-- Purpose: backfill any existing release_campaigns rows into the canonical
-- `campaigns` table (growth-schema.ts, campaign-manager/) as the write path
-- of record. The release-specific 5-category type system
-- (marketing/playlist/blog/press/pre_save) doesn't map 1:1 onto the
-- canonical growth_campaign_type enum, so the mapped value is stored in
-- campaign_type for real cross-module consistency, while the original
-- category/currency/legacy id are preserved in `metadata` for full history
-- fidelity — no campaign history is lost. Idempotent: safe to re-run,
-- skips rows already backfilled (matched by metadata->>'legacy_release_campaign_id').
--
-- Mapping (release_campaign_type -> growth_campaign_type):
--   marketing -> awareness   playlist -> playlist_push   blog -> press
--   press     -> press       pre_save -> release
-- Mapping (release_campaign_status -> growth_campaign_status):
--   planned -> draft          (active/paused/completed/cancelled are identical strings)
--
-- release_campaigns itself is NOT dropped or altered by this migration —
-- kept as a read-only historical/rollback reference until this
-- consolidation is verified in production; application code (release-
-- intelligence/release-intelligence.service.ts) no longer reads or writes
-- it as of this same phase. A later cleanup migration can drop the table
-- once confirmed safe.
--
-- Rollback:
--   DELETE FROM campaigns WHERE metadata->>'legacy_release_campaign_id' IS NOT NULL;

INSERT INTO campaigns (
  id, artist_id, release_id, name, description, campaign_type, status,
  start_date, budget, metadata, created_at, updated_at
)
SELECT
  gen_random_uuid(),
  rc.artist_id,
  rc.release_id,
  rc.title,
  rc.notes,
  (CASE rc.campaign_type
    WHEN 'marketing' THEN 'awareness'
    WHEN 'playlist'  THEN 'playlist_push'
    WHEN 'blog'      THEN 'press'
    WHEN 'press'     THEN 'press'
    WHEN 'pre_save'  THEN 'release'
  END)::growth_campaign_type,
  (CASE rc.status
    WHEN 'planned' THEN 'draft'
    ELSE rc.status::text
  END)::growth_campaign_status,
  rc.target_date,
  rc.budget,
  COALESCE(rc.metadata, '{}'::jsonb) || jsonb_build_object(
    'legacy_release_campaign_id', rc.id::text,
    'legacy_campaign_type', rc.campaign_type::text,
    'legacy_currency', rc.currency
  ),
  rc.created_at,
  rc.updated_at
FROM release_campaigns rc
WHERE NOT EXISTS (
  SELECT 1 FROM campaigns c WHERE c.metadata->>'legacy_release_campaign_id' = rc.id::text
);

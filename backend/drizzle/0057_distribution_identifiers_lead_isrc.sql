-- DATIAM OS — Phase 7a: distribution_identifiers gains canonical-ownership
-- constraints (schema-only, additive)
-- Migration 0057
--
-- Purpose: prepare `distribution_identifiers` (created empty/unwired by
-- migration 0052) to become the sole canonical store for ISRC/UPC per the
-- architecture roadmap's Phase 7. Two things are added:
--
--   1. `is_lead` boolean — marks a release's canonical "lead recording"
--      ISRC. This is NOT a duplicated value: it's a flag on the song's own
--      canonical ISRC row (which already carries both `song_id` and a
--      nullable `release_id`), so a release's lead ISRC and that song's
--      ISRC are always the exact same row — never two copies to keep in
--      sync. `releases.primary_isrc` (a bare, unattributed text field) is
--      the legacy shape this replaces.
--
--   2. Three partial unique indexes enforcing "Distribution is the single
--      source of truth" at the database level, something the old
--      `releases.upc`/`primary_isrc` columns and `catalog_identifiers`
--      table never enforced:
--        - at most one UPC per release
--        - at most one lead ISRC per release
--        - at most one canonical ISRC per song
--
-- Table has 0 rows in every environment checked, so this is a pure
-- additive/constraint migration — nothing to backfill or lose here (the
-- actual data backfill is migration 0058).
--
-- Rollback:
--   DROP INDEX IF EXISTS distribution_identifiers_song_isrc_unique;
--   DROP INDEX IF EXISTS distribution_identifiers_release_lead_isrc_unique;
--   DROP INDEX IF EXISTS distribution_identifiers_release_upc_unique;
--   ALTER TABLE distribution_identifiers DROP COLUMN IF EXISTS is_lead;

ALTER TABLE "distribution_identifiers" ADD COLUMN IF NOT EXISTS "is_lead" boolean DEFAULT false NOT NULL;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "distribution_identifiers_release_upc_unique"
  ON "distribution_identifiers" USING btree ("release_id")
  WHERE "identifier_type" = 'upc' AND "release_id" IS NOT NULL;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "distribution_identifiers_release_lead_isrc_unique"
  ON "distribution_identifiers" USING btree ("release_id")
  WHERE "identifier_type" = 'isrc' AND "is_lead" = true AND "release_id" IS NOT NULL;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "distribution_identifiers_song_isrc_unique"
  ON "distribution_identifiers" USING btree ("song_id")
  WHERE "identifier_type" = 'isrc' AND "song_id" IS NOT NULL;

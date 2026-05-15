-- Release Checklists v1 — production schema migration
-- Creates release_checklists table linked to releases(id).
-- Fully idempotent (IF NOT EXISTS / UNIQUE constraint guards).

CREATE TABLE IF NOT EXISTS release_checklists (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  release_id          UUID NOT NULL REFERENCES releases(id) ON DELETE CASCADE,
  lyrics_ready        BOOLEAN NOT NULL DEFAULT false,
  cover_art_ready     BOOLEAN NOT NULL DEFAULT false,
  mix_ready           BOOLEAN NOT NULL DEFAULT false,
  master_ready        BOOLEAN NOT NULL DEFAULT false,
  metadata_ready      BOOLEAN NOT NULL DEFAULT false,
  isrc_ready          BOOLEAN NOT NULL DEFAULT false,
  upc_ready           BOOLEAN NOT NULL DEFAULT false,
  distributor_ready   BOOLEAN NOT NULL DEFAULT false,
  release_date_ready  BOOLEAN NOT NULL DEFAULT false,
  promo_assets_ready  BOOLEAN NOT NULL DEFAULT false,
  sync_assets_ready   BOOLEAN NOT NULL DEFAULT false,
  final_approval      BOOLEAN NOT NULL DEFAULT false,
  notes               TEXT,
  readiness_status    TEXT NOT NULL DEFAULT 'not_ready',
  completion_percent  INTEGER NOT NULL DEFAULT 0,
  created_at          TIMESTAMP NOT NULL DEFAULT now(),
  updated_at          TIMESTAMP NOT NULL DEFAULT now(),
  CONSTRAINT release_checklists_release_id_unique UNIQUE (release_id)
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS release_checklists_release_id_idx      ON release_checklists(release_id);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS release_checklists_readiness_idx       ON release_checklists(readiness_status);

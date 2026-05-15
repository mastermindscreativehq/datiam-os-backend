-- 0011_release_state_engine.sql
-- Adds the release_state computed enum column to releases

DO $$ BEGIN
  CREATE TYPE release_state AS ENUM (
    'draft',
    'blocked',
    'almost_ready',
    'ready_for_distribution',
    'scheduled',
    'released'
  );
EXCEPTION WHEN duplicate_object THEN null; END $$;

ALTER TABLE releases
  ADD COLUMN IF NOT EXISTS release_state release_state NOT NULL DEFAULT 'draft';

CREATE INDEX IF NOT EXISTS releases_release_state_idx ON releases(release_state);

-- Backfill: seed state from existing music_status
UPDATE releases
SET release_state = CASE
  WHEN music_status = 'released'  THEN 'released'::release_state
  WHEN music_status = 'scheduled' THEN 'scheduled'::release_state
  ELSE 'draft'::release_state
END;

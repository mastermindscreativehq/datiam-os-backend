-- Music Core v1 — production schema migration
-- Additive only: new columns + nullable change on releases.song_id.
-- Fully idempotent (IF NOT EXISTS / IF EXISTS guards everywhere).

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. New enum: music release lifecycle status
-- ─────────────────────────────────────────────────────────────────────────────
DO $$ BEGIN
  CREATE TYPE music_release_status AS ENUM ('draft', 'scheduled', 'released');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. releases table — Music Core v1 columns
-- ─────────────────────────────────────────────────────────────────────────────

-- artist_id: releases now belong directly to an artist (not via a single song)
ALTER TABLE releases ADD COLUMN IF NOT EXISTS artist_id    UUID REFERENCES artist_profiles(id) ON DELETE CASCADE;

-- slug: URL-safe identifier for the release
ALTER TABLE releases ADD COLUMN IF NOT EXISTS slug         TEXT;

-- music_status: draft → scheduled → released lifecycle
ALTER TABLE releases ADD COLUMN IF NOT EXISTS music_status music_release_status NOT NULL DEFAULT 'draft';

-- genre, cover art, description, total track count
ALTER TABLE releases ADD COLUMN IF NOT EXISTS genre        TEXT;
ALTER TABLE releases ADD COLUMN IF NOT EXISTS cover_art_url TEXT;
ALTER TABLE releases ADD COLUMN IF NOT EXISTS description  TEXT;
ALTER TABLE releases ADD COLUMN IF NOT EXISTS total_tracks INTEGER;

-- Make song_id nullable — old design required exactly one song per release;
-- new design links songs → releases (many songs per release).
ALTER TABLE releases ALTER COLUMN song_id DROP NOT NULL;

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. releases indexes
-- ─────────────────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS releases_artist_id_idx    ON releases(artist_id);
CREATE INDEX IF NOT EXISTS releases_slug_idx         ON releases(slug);
CREATE INDEX IF NOT EXISTS releases_release_date_idx ON releases(release_date);
CREATE INDEX IF NOT EXISTS releases_music_status_idx ON releases(music_status);

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. songs table — Music Core v1 columns
-- ─────────────────────────────────────────────────────────────────────────────

-- release_id: songs optionally belong to a release (nullable = standalone song)
ALTER TABLE songs ADD COLUMN IF NOT EXISTS release_id       UUID REFERENCES releases(id) ON DELETE SET NULL;

-- slug, music metadata
ALTER TABLE songs ADD COLUMN IF NOT EXISTS slug             TEXT;
ALTER TABLE songs ADD COLUMN IF NOT EXISTS musical_key      TEXT;
ALTER TABLE songs ADD COLUMN IF NOT EXISTS duration_seconds INTEGER;
ALTER TABLE songs ADD COLUMN IF NOT EXISTS language         TEXT;
ALTER TABLE songs ADD COLUMN IF NOT EXISTS track_number     INTEGER;
ALTER TABLE songs ADD COLUMN IF NOT EXISTS disk_number      INTEGER;

-- Media URLs
ALTER TABLE songs ADD COLUMN IF NOT EXISTS audio_url        TEXT;
ALTER TABLE songs ADD COLUMN IF NOT EXISTS waveform_url     TEXT;
ALTER TABLE songs ADD COLUMN IF NOT EXISTS cover_art_url    TEXT;

-- AI intelligence scores (0.00–1.00, populated by AI pipeline)
ALTER TABLE songs ADD COLUMN IF NOT EXISTS energy_score     NUMERIC(3,2);
ALTER TABLE songs ADD COLUMN IF NOT EXISTS emotion_score    NUMERIC(3,2);
ALTER TABLE songs ADD COLUMN IF NOT EXISTS viral_score      NUMERIC(3,2);
ALTER TABLE songs ADD COLUMN IF NOT EXISTS commercial_score NUMERIC(3,2);
ALTER TABLE songs ADD COLUMN IF NOT EXISTS spiritual_score  NUMERIC(3,2);

-- ─────────────────────────────────────────────────────────────────────────────
-- 5. songs indexes
-- ─────────────────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS songs_release_id_idx ON songs(release_id);
CREATE INDEX IF NOT EXISTS songs_slug_idx        ON songs(slug);

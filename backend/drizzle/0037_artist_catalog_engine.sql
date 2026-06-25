-- DATIAM Artist & Catalog Engine v1
-- Migration 0037

-- Add array columns to artist_profiles
ALTER TABLE artist_profiles ADD COLUMN IF NOT EXISTS genres         text[] DEFAULT '{}';
--> statement-breakpoint
ALTER TABLE artist_profiles ADD COLUMN IF NOT EXISTS countries      text[] DEFAULT '{}';
--> statement-breakpoint
ALTER TABLE artist_profiles ADD COLUMN IF NOT EXISTS catalog_status text   DEFAULT 'active';
--> statement-breakpoint

-- Add array/metadata columns to songs
ALTER TABLE songs ADD COLUMN IF NOT EXISTS writers   text[] DEFAULT '{}';
--> statement-breakpoint
ALTER TABLE songs ADD COLUMN IF NOT EXISTS producers text[] DEFAULT '{}';
--> statement-breakpoint
ALTER TABLE songs ADD COLUMN IF NOT EXISTS tags      text[] DEFAULT '{}';
--> statement-breakpoint

-- Add catalog columns to releases
ALTER TABLE releases ADD COLUMN IF NOT EXISTS preorder_date         date;
--> statement-breakpoint
ALTER TABLE releases ADD COLUMN IF NOT EXISTS catalog_release_type text DEFAULT 'single';
--> statement-breakpoint

-- Enums
DO $$ BEGIN
  CREATE TYPE catalog_artwork_type AS ENUM ('cover', 'social', 'animated', 'thumbnail');
  EXCEPTION WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint

DO $$ BEGIN
  CREATE TYPE catalog_document_type AS ENUM ('split_sheet', 'contract', 'lyric_sheet', 'publishing_agreement', 'copyright_certificate');
  EXCEPTION WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint

DO $$ BEGIN
  CREATE TYPE catalog_identifier_type AS ENUM ('isrc', 'upc', 'iswc', 'catalog_number');
  EXCEPTION WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint

DO $$ BEGIN
  CREATE TYPE catalog_credit_role AS ENUM ('writer', 'producer', 'engineer', 'composer', 'featured_artist', 'publisher', 'mixer', 'mastering_engineer', 'lyricist', 'arranger');
  EXCEPTION WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint

-- catalog_tracks: junction between releases and songs
CREATE TABLE IF NOT EXISTS catalog_tracks (
  id           uuid    PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  release_id   uuid    NOT NULL REFERENCES releases(id) ON DELETE CASCADE,
  song_id      uuid    NOT NULL REFERENCES songs(id) ON DELETE CASCADE,
  track_number integer NOT NULL DEFAULT 1,
  is_single    boolean NOT NULL DEFAULT false,
  created_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE(release_id, song_id)
);
--> statement-breakpoint

-- catalog_artwork_assets
CREATE TABLE IF NOT EXISTS catalog_artwork_assets (
  id               uuid                  PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  release_id       uuid                  REFERENCES releases(id) ON DELETE CASCADE,
  song_id          uuid                  REFERENCES songs(id) ON DELETE CASCADE,
  artwork_type     catalog_artwork_type  NOT NULL,
  storage_url      text                  NOT NULL,
  filename         text,
  file_size_bytes  integer,
  width_px         integer,
  height_px        integer,
  format           text,
  storage_provider text                  DEFAULT 'supabase',
  created_at       timestamptz           NOT NULL DEFAULT now()
);
--> statement-breakpoint

-- catalog_documents
CREATE TABLE IF NOT EXISTS catalog_documents (
  id              uuid                   PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  artist_id       uuid                   REFERENCES artist_profiles(id) ON DELETE SET NULL,
  song_id         uuid                   REFERENCES songs(id) ON DELETE SET NULL,
  release_id      uuid                   REFERENCES releases(id) ON DELETE SET NULL,
  document_type   catalog_document_type  NOT NULL,
  title           text                   NOT NULL,
  storage_url     text                   NOT NULL,
  filename        text,
  file_size_bytes integer,
  notes           text,
  uploaded_at     timestamptz            NOT NULL DEFAULT now(),
  created_at      timestamptz            NOT NULL DEFAULT now()
);
--> statement-breakpoint

-- catalog_identifiers
CREATE TABLE IF NOT EXISTS catalog_identifiers (
  id              uuid                     PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  song_id         uuid                     REFERENCES songs(id) ON DELETE SET NULL,
  release_id      uuid                     REFERENCES releases(id) ON DELETE SET NULL,
  identifier_type catalog_identifier_type  NOT NULL,
  value           text                     NOT NULL,
  assigned_by     text,
  assigned_at     timestamptz,
  created_at      timestamptz              NOT NULL DEFAULT now()
);
--> statement-breakpoint

-- catalog_credits
CREATE TABLE IF NOT EXISTS catalog_credits (
  id               uuid                 PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  song_id          uuid                 NOT NULL REFERENCES songs(id) ON DELETE CASCADE,
  name             text                 NOT NULL,
  role             catalog_credit_role  NOT NULL,
  split_percentage numeric(5,2),
  pro_affiliation  text,
  ipi_number       text,
  isni             text,
  notes            text,
  created_at       timestamptz          NOT NULL DEFAULT now(),
  updated_at       timestamptz          NOT NULL DEFAULT now()
);
--> statement-breakpoint

-- Indexes: catalog_tracks
CREATE INDEX IF NOT EXISTS catalog_tracks_release_id_idx  ON catalog_tracks(release_id);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS catalog_tracks_song_id_idx     ON catalog_tracks(song_id);
--> statement-breakpoint

-- Indexes: catalog_artwork_assets
CREATE INDEX IF NOT EXISTS catalog_artwork_release_id_idx ON catalog_artwork_assets(release_id);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS catalog_artwork_song_id_idx    ON catalog_artwork_assets(song_id);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS catalog_artwork_type_idx       ON catalog_artwork_assets(artwork_type);
--> statement-breakpoint

-- Indexes: catalog_documents
CREATE INDEX IF NOT EXISTS catalog_documents_artist_id_idx  ON catalog_documents(artist_id);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS catalog_documents_song_id_idx    ON catalog_documents(song_id);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS catalog_documents_release_id_idx ON catalog_documents(release_id);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS catalog_documents_type_idx       ON catalog_documents(document_type);
--> statement-breakpoint

-- Indexes: catalog_identifiers
CREATE INDEX IF NOT EXISTS catalog_identifiers_song_id_idx    ON catalog_identifiers(song_id);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS catalog_identifiers_release_id_idx ON catalog_identifiers(release_id);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS catalog_identifiers_type_idx       ON catalog_identifiers(identifier_type);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS catalog_identifiers_value_idx      ON catalog_identifiers(value);
--> statement-breakpoint

-- Indexes: catalog_credits
CREATE INDEX IF NOT EXISTS catalog_credits_song_id_idx ON catalog_credits(song_id);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS catalog_credits_role_idx    ON catalog_credits(role);
--> statement-breakpoint

-- Seed automation workflow registry with catalog events
INSERT INTO workflow_registry (name, description, event_triggers, webhook_path, is_active) VALUES
  ('artist-created',          'Fires when a new artist is created',                 ARRAY['artist.created'],          '/webhook/catalog', true),
  ('artist-updated',          'Fires when an artist is updated',                    ARRAY['artist.updated'],          '/webhook/catalog', true),
  ('song-created',            'Fires when a new song is created',                   ARRAY['song.created'],            '/webhook/catalog', true),
  ('song-updated',            'Fires when a song is updated',                       ARRAY['song.updated'],            '/webhook/catalog', true),
  ('catalog-release-created', 'Fires when a release is created via catalog engine', ARRAY['catalog.release.created'], '/webhook/catalog', true),
  ('catalog-release-updated', 'Fires when a release is updated via catalog engine', ARRAY['catalog.release.updated'], '/webhook/catalog', true),
  ('asset-uploaded',          'Fires when an asset is uploaded',                    ARRAY['asset.uploaded'],          '/webhook/catalog', true),
  ('credit-updated',          'Fires when credits are updated',                     ARRAY['credit.updated'],          '/webhook/catalog', true),
  ('document-uploaded',       'Fires when a document is uploaded',                  ARRAY['document.uploaded'],       '/webhook/catalog', true)
ON CONFLICT (name) DO NOTHING;

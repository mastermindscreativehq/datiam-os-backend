-- DATIAM Artist Intelligence / Release Intelligence Extension / Music Links Hub v1
-- Migration 0051

-- ── Drift catch-up: migration 0037 added these columns via raw ALTER but they
-- were never reflected in src/db/schema.ts. Re-declared here as IF NOT EXISTS
-- so this migration is a no-op for them on any DB that already ran 0037, while
-- still being safe to apply on a fresh DB that never did.
ALTER TABLE artist_profiles ADD COLUMN IF NOT EXISTS genres         text[] DEFAULT '{}';
--> statement-breakpoint
ALTER TABLE artist_profiles ADD COLUMN IF NOT EXISTS countries      text[] DEFAULT '{}';
--> statement-breakpoint
ALTER TABLE artist_profiles ADD COLUMN IF NOT EXISTS catalog_status text   DEFAULT 'active';
--> statement-breakpoint
ALTER TABLE releases ADD COLUMN IF NOT EXISTS preorder_date         date;
--> statement-breakpoint
ALTER TABLE releases ADD COLUMN IF NOT EXISTS catalog_release_type  text DEFAULT 'single';
--> statement-breakpoint

-- ── Artist Intelligence v1 — identity ────────────────────────────────────────
ALTER TABLE artist_profiles ADD COLUMN IF NOT EXISTS city     text;
--> statement-breakpoint
ALTER TABLE artist_profiles ADD COLUMN IF NOT EXISTS region   text;
--> statement-breakpoint
ALTER TABLE artist_profiles ADD COLUMN IF NOT EXISTS verified boolean NOT NULL DEFAULT false;
--> statement-breakpoint

-- ── Artist Intelligence v1 — business metadata ──────────────────────────────
ALTER TABLE artist_profiles ADD COLUMN IF NOT EXISTS management_company       text;
--> statement-breakpoint
ALTER TABLE artist_profiles ADD COLUMN IF NOT EXISTS management_contact_name  text;
--> statement-breakpoint
ALTER TABLE artist_profiles ADD COLUMN IF NOT EXISTS management_contact_email text;
--> statement-breakpoint
ALTER TABLE artist_profiles ADD COLUMN IF NOT EXISTS management_contact_phone text;
--> statement-breakpoint
ALTER TABLE artist_profiles ADD COLUMN IF NOT EXISTS booking_agent            text;
--> statement-breakpoint
ALTER TABLE artist_profiles ADD COLUMN IF NOT EXISTS booking_contact_email    text;
--> statement-breakpoint
ALTER TABLE artist_profiles ADD COLUMN IF NOT EXISTS booking_contact_phone    text;
--> statement-breakpoint
ALTER TABLE artist_profiles ADD COLUMN IF NOT EXISTS label_name               text;
--> statement-breakpoint
ALTER TABLE artist_profiles ADD COLUMN IF NOT EXISTS publisher_name           text;
--> statement-breakpoint
ALTER TABLE artist_profiles ADD COLUMN IF NOT EXISTS pro_affiliation          text;
--> statement-breakpoint
ALTER TABLE artist_profiles ADD COLUMN IF NOT EXISTS press_contact_email      text;
--> statement-breakpoint

-- ── Artist Intelligence v1 — distribution ───────────────────────────────────
ALTER TABLE artist_profiles ADD COLUMN IF NOT EXISTS distributor_name      text;
--> statement-breakpoint
ALTER TABLE artist_profiles ADD COLUMN IF NOT EXISTS distributor_artist_id text;
--> statement-breakpoint
ALTER TABLE artist_profiles ADD COLUMN IF NOT EXISTS primary_territory     text;
--> statement-breakpoint
ALTER TABLE artist_profiles ADD COLUMN IF NOT EXISTS territories           jsonb DEFAULT '[]';
--> statement-breakpoint

-- ── Artist Intelligence v1 — rights management ──────────────────────────────
ALTER TABLE artist_profiles ADD COLUMN IF NOT EXISTS ipi_number               text;
--> statement-breakpoint
ALTER TABLE artist_profiles ADD COLUMN IF NOT EXISTS isni_code                text;
--> statement-breakpoint
ALTER TABLE artist_profiles ADD COLUMN IF NOT EXISTS master_rights_owner      text;
--> statement-breakpoint
ALTER TABLE artist_profiles ADD COLUMN IF NOT EXISTS publishing_rights_owner  text;
--> statement-breakpoint
ALTER TABLE artist_profiles ADD COLUMN IF NOT EXISTS rights_notes             text;
--> statement-breakpoint

-- ── Release Intelligence v1 — additional streaming platform URLs ───────────
ALTER TABLE releases ADD COLUMN IF NOT EXISTS deezer_url        text;
--> statement-breakpoint
ALTER TABLE releases ADD COLUMN IF NOT EXISTS tidal_url         text;
--> statement-breakpoint
ALTER TABLE releases ADD COLUMN IF NOT EXISTS amazon_music_url  text;
--> statement-breakpoint
ALTER TABLE releases ADD COLUMN IF NOT EXISTS youtube_music_url text;
--> statement-breakpoint
ALTER TABLE releases ADD COLUMN IF NOT EXISTS soundcloud_url    text;
--> statement-breakpoint

-- ── Release Intelligence v1 — territories + lead-track ISRC convenience ────
ALTER TABLE releases ADD COLUMN IF NOT EXISTS territories  jsonb DEFAULT '[]';
--> statement-breakpoint
ALTER TABLE releases ADD COLUMN IF NOT EXISTS primary_isrc text;
--> statement-breakpoint

-- ── Music Links Hub v1 ───────────────────────────────────────────────────────
DO $$ BEGIN
  CREATE TYPE music_link_category AS ENUM ('music_platform', 'social_media', 'smart_link', 'pre_save', 'business', 'distribution', 'other');
  EXCEPTION WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS music_links (
  id            uuid                 PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  artist_id     uuid                 REFERENCES artist_profiles(id) ON DELETE CASCADE,
  release_id    uuid                 REFERENCES releases(id) ON DELETE CASCADE,
  link_category music_link_category  NOT NULL,
  platform      text                 NOT NULL,
  url           text                 NOT NULL,
  label         text,
  is_primary    boolean              NOT NULL DEFAULT false,
  is_active     boolean              NOT NULL DEFAULT true,
  click_count   integer              NOT NULL DEFAULT 0,
  territory     text,
  display_order integer              NOT NULL DEFAULT 0,
  metadata      jsonb                DEFAULT '{}',
  created_at    timestamptz          NOT NULL DEFAULT now(),
  updated_at    timestamptz          NOT NULL DEFAULT now()
);
--> statement-breakpoint

ALTER TABLE music_links DROP CONSTRAINT IF EXISTS music_links_owner_xor_check;
--> statement-breakpoint

ALTER TABLE music_links ADD CONSTRAINT music_links_owner_xor_check
  CHECK ((artist_id IS NOT NULL AND release_id IS NULL) OR (artist_id IS NULL AND release_id IS NOT NULL));
--> statement-breakpoint

CREATE INDEX IF NOT EXISTS music_links_artist_id_idx          ON music_links (artist_id);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS music_links_release_id_idx         ON music_links (release_id);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS music_links_category_idx           ON music_links (link_category);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS music_links_platform_idx           ON music_links (platform);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS music_links_artist_category_idx    ON music_links (artist_id, link_category);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS music_links_release_category_idx   ON music_links (release_id, link_category);
--> statement-breakpoint

-- ── Automation registry: Music Links events + new outreach segment workflows ─
INSERT INTO workflow_registry (name, description, event_triggers, webhook_path, is_active) VALUES
  ('music-links-events', 'Fires when an artist/release URL is added, updated, or removed via the Music Links Hub', ARRAY['music_links.created', 'music_links.updated', 'music_links.deleted'], '/webhook/music-links', true),
  ('dj-outreach',        'Automated DJ outreach — discovers and contacts DJs/curators for a release',                ARRAY['automation.dj_outreach.requested'],   '/webhook/dj-outreach',   true),
  ('blog-outreach',      'Automated blog/press outreach — discovers and contacts music blogs for a release',        ARRAY['automation.blog_outreach.requested'], '/webhook/blog-outreach', true)
ON CONFLICT (name) DO NOTHING;

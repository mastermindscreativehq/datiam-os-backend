-- DATIAM Growth OS — Social Account Manager
-- Migration 0040
--
-- Purpose: Create reference data and social account management tables.
--   - platform_definitions: normalized registry of all supported platforms.
--     Seeded with the 13 platforms required by Growth OS.
--   - countries: ISO 3166-1 alpha-2 reference table for key music markets.
--     Seeded with 40 markets. Additional rows can be inserted at any time.
--   - social_accounts: one row per artist × platform × username.
--
-- Rollback:
--   DROP TABLE IF EXISTS social_accounts;
--   DROP TABLE IF EXISTS countries;
--   DROP TABLE IF EXISTS platform_definitions;
--   DROP TYPE IF EXISTS social_account_status;

-- ── 1. Enum ────────────────────────────────────────────────────────────────
DO $$ BEGIN
  CREATE TYPE social_account_status AS ENUM (
    'active', 'inactive', 'pending', 'disconnected'
  );
  EXCEPTION WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint

-- ── 2. platform_definitions ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS platform_definitions (
  id                  uuid        PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  name                text        NOT NULL,
  slug                text        NOT NULL UNIQUE,
  icon_url            text,
  base_url            text,
  api_supported       boolean     NOT NULL DEFAULT false,
  max_caption_length  integer,
  max_hashtags        integer,
  supports_video      boolean     NOT NULL DEFAULT true,
  supports_stories    boolean     NOT NULL DEFAULT false,
  supports_reels      boolean     NOT NULL DEFAULT false,
  supports_shorts     boolean     NOT NULL DEFAULT false,
  is_music_platform   boolean     NOT NULL DEFAULT false,
  created_at          timestamptz NOT NULL DEFAULT now()
);
--> statement-breakpoint

-- Seed all 13 Growth OS platforms
INSERT INTO platform_definitions
  (name, slug, api_supported, max_caption_length, max_hashtags, supports_video, supports_stories, supports_reels, supports_shorts, is_music_platform)
VALUES
  ('Instagram',   'instagram',   false, 2200,  30,  true,  true,  true,  false, false),
  ('TikTok',      'tiktok',      false, 2200,  100, true,  false, false, false, false),
  ('Facebook',    'facebook',    false, 63206, 30,  true,  true,  true,  false, false),
  ('YouTube',     'youtube',     false, 5000,  500, true,  false, false, true,  false),
  ('Spotify',     'spotify',     false, null,  null, false, false, false, false, true),
  ('Apple Music', 'apple-music', false, null,  null, false, false, false, false, true),
  ('Audiomack',   'audiomack',   false, 500,   null, true,  false, false, false, true),
  ('Boomplay',    'boomplay',    false, 500,   null, true,  false, false, false, true),
  ('SoundCloud',  'soundcloud',  false, 1000,  null, true,  false, false, false, true),
  ('X',           'x',           false, 280,   10,  true,  false, false, false, false),
  ('Threads',     'threads',     false, 500,   30,  true,  false, false, false, false),
  ('Pinterest',   'pinterest',   false, 500,   20,  true,  false, false, false, false),
  ('Snapchat',    'snapchat',    false, 250,   null, true,  true,  false, false, false)
ON CONFLICT (slug) DO NOTHING;
--> statement-breakpoint

-- ── 3. countries — key music market reference ──────────────────────────────
CREATE TABLE IF NOT EXISTS countries (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  name          text        NOT NULL,
  iso_code      text        NOT NULL UNIQUE,
  region        text,
  is_key_market boolean     NOT NULL DEFAULT false,
  created_at    timestamptz NOT NULL DEFAULT now()
);
--> statement-breakpoint

-- Seed key music markets (iso_code is the natural unique key)
INSERT INTO countries (name, iso_code, region, is_key_market) VALUES
  ('United States',       'US', 'North America',  true),
  ('United Kingdom',      'GB', 'Europe',         true),
  ('Nigeria',             'NG', 'Africa',         true),
  ('Ghana',               'GH', 'Africa',         true),
  ('Kenya',               'KE', 'Africa',         true),
  ('South Africa',        'ZA', 'Africa',         true),
  ('Canada',              'CA', 'North America',  true),
  ('Australia',           'AU', 'Oceania',        true),
  ('Germany',             'DE', 'Europe',         true),
  ('France',              'FR', 'Europe',         true),
  ('Sweden',              'SE', 'Europe',         true),
  ('Brazil',              'BR', 'South America',  true),
  ('Mexico',              'MX', 'Latin America',  true),
  ('Japan',               'JP', 'Asia',           true),
  ('South Korea',         'KR', 'Asia',           true),
  ('India',               'IN', 'Asia',           true),
  ('Norway',              'NO', 'Europe',         false),
  ('Spain',               'ES', 'Europe',         false),
  ('Italy',               'IT', 'Europe',         false),
  ('Colombia',            'CO', 'Latin America',  false),
  ('Argentina',           'AR', 'South America',  false),
  ('Indonesia',           'ID', 'Asia',           false),
  ('Philippines',         'PH', 'Asia',           false),
  ('Tanzania',            'TZ', 'Africa',         false),
  ('Uganda',              'UG', 'Africa',         false),
  ('Senegal',             'SN', 'Africa',         false),
  ('Ivory Coast',         'CI', 'Africa',         false),
  ('Ethiopia',            'ET', 'Africa',         false),
  ('Netherlands',         'NL', 'Europe',         false),
  ('Poland',              'PL', 'Europe',         false),
  ('Portugal',            'PT', 'Europe',         false),
  ('UAE',                 'AE', 'Middle East',    false),
  ('New Zealand',         'NZ', 'Oceania',        false),
  ('Ireland',             'IE', 'Europe',         false),
  ('Jamaica',             'JM', 'Caribbean',      false),
  ('Trinidad and Tobago', 'TT', 'Caribbean',      false),
  ('Denmark',             'DK', 'Europe',         false),
  ('Finland',             'FI', 'Europe',         false),
  ('Belgium',             'BE', 'Europe',         false),
  ('Switzerland',         'CH', 'Europe',         false)
ON CONFLICT (iso_code) DO NOTHING;
--> statement-breakpoint

-- ── 4. social_accounts ─────────────────────────────────────────────────────
-- api_credentials is stored as JSONB. Encrypt sensitive fields at the
-- application layer before writing; never log this column.
CREATE TABLE IF NOT EXISTS social_accounts (
  id              uuid                  PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  artist_id       uuid                  REFERENCES artist_profiles(id) ON DELETE CASCADE,
  platform_id     uuid                  NOT NULL REFERENCES platform_definitions(id) ON DELETE RESTRICT,
  username        text                  NOT NULL,
  display_name    text,
  profile_url     text,
  audience_count  bigint                NOT NULL DEFAULT 0,
  language        text                  NOT NULL DEFAULT 'en',
  country_id      uuid                  REFERENCES countries(id) ON DELETE SET NULL,
  purpose         text,
  posting_schedule jsonb                NOT NULL DEFAULT '{}'::jsonb,
  last_activity_at timestamptz,
  growth_metrics  jsonb                 NOT NULL DEFAULT '{}'::jsonb,
  status          social_account_status NOT NULL DEFAULT 'active',
  api_credentials jsonb                 NOT NULL DEFAULT '{}'::jsonb,
  notes           text,
  created_at      timestamptz           NOT NULL DEFAULT now(),
  updated_at      timestamptz           NOT NULL DEFAULT now(),
  -- Prevent duplicate account registrations for the same username on a platform
  UNIQUE (artist_id, platform_id, username)
);
--> statement-breakpoint

-- ── 5. Indexes ─────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS platform_definitions_slug_idx         ON platform_definitions(slug);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS platform_definitions_music_idx        ON platform_definitions(is_music_platform);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS countries_iso_code_idx                ON countries(iso_code);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS countries_region_idx                  ON countries(region);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS countries_key_market_idx              ON countries(is_key_market);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS social_accounts_artist_id_idx         ON social_accounts(artist_id);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS social_accounts_platform_id_idx       ON social_accounts(platform_id);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS social_accounts_status_idx            ON social_accounts(status);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS social_accounts_artist_platform_idx   ON social_accounts(artist_id, platform_id);

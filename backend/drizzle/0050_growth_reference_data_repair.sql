-- 0050_growth_reference_data_repair.sql
-- Repair: platform_definitions, countries, and social_accounts were created by
-- migration 0040 with one column layout, but src/db/growth-schema.ts (the model
-- actually used by seed.ts and the Growth OS services) was later redesigned with
-- a different set of columns. No follow-up migration ever applied that redesign
-- to the database, so `supports_scheduling` and friends never existed on disk —
-- this repairs the drift so the DB matches growth-schema.ts.
--
-- platform_definitions (13 rows) and countries (40 rows) are truncated: they were
-- seeded by 0040's own INSERT statements with data that no longer matches the
-- curated Growth OS Phase I dataset in seed.ts (6 platforms / 15 markets), so
-- npm run db:seed can repopulate them cleanly. social_accounts has 0 rows and no
-- dependents, so its column changes are safe with no data migration needed.

-- platform_definitions/countries/social_accounts are referenced by several other
-- Growth OS tables (scheduled_posts, published_posts, analytics_snapshots, etc.),
-- all empty at this point, so CASCADE is safe here.
TRUNCATE TABLE social_accounts, platform_definitions, countries RESTART IDENTITY CASCADE;
--> statement-breakpoint

-- ── platform_definitions ─────────────────────────────────────────────────────
DROP INDEX IF EXISTS platform_definitions_music_idx;
--> statement-breakpoint

ALTER TABLE platform_definitions
  ADD COLUMN IF NOT EXISTS supports_scheduling boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS supports_analytics  boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_streaming        boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_social           boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS is_active           boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS metadata            jsonb   NOT NULL DEFAULT '{}',
  DROP COLUMN IF EXISTS api_supported,
  DROP COLUMN IF EXISTS max_caption_length,
  DROP COLUMN IF EXISTS max_hashtags,
  DROP COLUMN IF EXISTS supports_video,
  DROP COLUMN IF EXISTS supports_stories,
  DROP COLUMN IF EXISTS supports_reels,
  DROP COLUMN IF EXISTS supports_shorts,
  DROP COLUMN IF EXISTS is_music_platform;
--> statement-breakpoint

CREATE INDEX IF NOT EXISTS platform_definitions_is_active_idx ON platform_definitions (is_active);
--> statement-breakpoint

-- ── countries ─────────────────────────────────────────────────────────────────
DROP INDEX IF EXISTS countries_key_market_idx;
--> statement-breakpoint

ALTER TABLE countries
  ADD COLUMN IF NOT EXISTS is_music_market boolean NOT NULL DEFAULT true,
  DROP COLUMN IF EXISTS is_key_market;
--> statement-breakpoint

-- ── social_accounts ──────────────────────────────────────────────────────────
ALTER TABLE social_accounts
  ALTER COLUMN artist_id SET NOT NULL,
  ADD COLUMN IF NOT EXISTS profile_image_url       text,
  ADD COLUMN IF NOT EXISTS followers_count         bigint  NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS following_count         bigint  NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS posts_count             bigint  NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS avg_views               bigint  NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS avg_likes               bigint  NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS avg_comments            bigint  NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS engagement_rate         numeric(6,4) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS access_token_encrypted  text,
  ADD COLUMN IF NOT EXISTS refresh_token_encrypted text,
  ADD COLUMN IF NOT EXISTS token_expires_at        timestamptz,
  ADD COLUMN IF NOT EXISTS last_synced_at          timestamptz,
  ADD COLUMN IF NOT EXISTS metadata                jsonb   NOT NULL DEFAULT '{}',
  DROP COLUMN IF EXISTS audience_count,
  DROP COLUMN IF EXISTS language,
  DROP COLUMN IF EXISTS country_id,
  DROP COLUMN IF EXISTS purpose,
  DROP COLUMN IF EXISTS posting_schedule,
  DROP COLUMN IF EXISTS last_activity_at,
  DROP COLUMN IF EXISTS growth_metrics,
  DROP COLUMN IF EXISTS api_credentials,
  DROP COLUMN IF EXISTS notes;
--> statement-breakpoint

CREATE INDEX IF NOT EXISTS social_accounts_followers_count_idx ON social_accounts (followers_count);

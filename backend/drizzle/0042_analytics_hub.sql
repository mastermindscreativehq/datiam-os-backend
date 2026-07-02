-- DATIAM Growth OS — Analytics Hub
-- Migration 0042
--
-- Purpose: Create the unified Analytics Hub tables.
--   - analytics_snapshots: daily account-level social metrics per platform.
--     One row per (social_account, platform, date). Unique constraint prevents
--     double-ingestion.
--   - post_analytics: per-post performance captured after publication.
--     Written by the analyticsHubQueue worker after content.published fires.
--   - platform_metrics: aggregated DSP/streaming data per artist × platform
--     × period. Covers streaming services that don't have post-level data.
--
-- Rollback:
--   DROP TABLE IF EXISTS platform_metrics;
--   DROP TABLE IF EXISTS post_analytics;
--   DROP TABLE IF EXISTS analytics_snapshots;

-- ── 1. analytics_snapshots ─────────────────────────────────────────────────
-- Indexed heavily for the Analytics Hub time-series queries.
CREATE TABLE IF NOT EXISTS analytics_snapshots (
  id                uuid        PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  social_account_id uuid        REFERENCES social_accounts(id) ON DELETE CASCADE,
  artist_id         uuid        REFERENCES artist_profiles(id) ON DELETE CASCADE,
  platform_id       uuid        NOT NULL REFERENCES platform_definitions(id) ON DELETE RESTRICT,
  snapshot_date     date        NOT NULL,
  -- Engagement metrics
  views             bigint      NOT NULL DEFAULT 0,
  reach             bigint      NOT NULL DEFAULT 0,
  watch_time_seconds bigint     NOT NULL DEFAULT 0,
  likes             bigint      NOT NULL DEFAULT 0,
  comments          bigint      NOT NULL DEFAULT 0,
  shares            bigint      NOT NULL DEFAULT 0,
  saves             bigint      NOT NULL DEFAULT 0,
  impressions       bigint      NOT NULL DEFAULT 0,
  -- Audience metrics
  followers_count   bigint      NOT NULL DEFAULT 0,
  followers_delta   integer     NOT NULL DEFAULT 0,
  subscribers_count bigint      NOT NULL DEFAULT 0,
  -- Music-specific metrics (populated for music platforms)
  streams_count     bigint      NOT NULL DEFAULT 0,
  playlist_adds     integer     NOT NULL DEFAULT 0,
  -- Derived metrics
  ctr               numeric(8,6) NOT NULL DEFAULT 0,
  profile_visits    bigint      NOT NULL DEFAULT 0,
  -- Breakdown data stored as JSONB for flexibility
  country_breakdown  jsonb      NOT NULL DEFAULT '{}'::jsonb,
  device_breakdown   jsonb      NOT NULL DEFAULT '{}'::jsonb,
  traffic_sources    jsonb      NOT NULL DEFAULT '{}'::jsonb,
  raw_data           jsonb      NOT NULL DEFAULT '{}'::jsonb,
  created_at         timestamptz NOT NULL DEFAULT now(),
  -- One snapshot per account per platform per day
  UNIQUE (social_account_id, platform_id, snapshot_date)
);
--> statement-breakpoint

-- ── 2. post_analytics ──────────────────────────────────────────────────────
-- Captures granular performance for each published post.
-- Populated by the analyticsHubQueue worker after publication.
CREATE TABLE IF NOT EXISTS post_analytics (
  id                       uuid        PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  published_post_id        uuid        REFERENCES published_posts(id) ON DELETE CASCADE,
  content_id               uuid        REFERENCES content_ideas(id) ON DELETE SET NULL,
  platform_id              uuid        NOT NULL REFERENCES platform_definitions(id) ON DELETE RESTRICT,
  campaign_id              uuid        REFERENCES campaigns(id) ON DELETE SET NULL,
  captured_at              timestamptz NOT NULL DEFAULT now(),
  -- Engagement metrics
  views                    bigint      NOT NULL DEFAULT 0,
  reach                    bigint      NOT NULL DEFAULT 0,
  likes                    bigint      NOT NULL DEFAULT 0,
  comments                 bigint      NOT NULL DEFAULT 0,
  shares                   bigint      NOT NULL DEFAULT 0,
  saves                    bigint      NOT NULL DEFAULT 0,
  watch_time_seconds       bigint      NOT NULL DEFAULT 0,
  watch_through_rate       numeric(6,4) NOT NULL DEFAULT 0,
  ctr                      numeric(8,6) NOT NULL DEFAULT 0,
  -- Conversion metrics
  profile_visits_from_post integer     NOT NULL DEFAULT 0,
  follows_from_post        integer     NOT NULL DEFAULT 0,
  -- Breakdown data
  country_breakdown        jsonb       NOT NULL DEFAULT '{}'::jsonb,
  device_breakdown         jsonb       NOT NULL DEFAULT '{}'::jsonb,
  traffic_sources          jsonb       NOT NULL DEFAULT '{}'::jsonb,
  age_gender_breakdown     jsonb       NOT NULL DEFAULT '{}'::jsonb,
  raw_data                 jsonb       NOT NULL DEFAULT '{}'::jsonb,
  created_at               timestamptz NOT NULL DEFAULT now()
);
--> statement-breakpoint

-- ── 3. platform_metrics ────────────────────────────────────────────────────
-- Aggregated DSP and streaming service metrics per artist, platform, period.
-- song_id is nullable — NULL represents artist-level aggregates.
CREATE TABLE IF NOT EXISTS platform_metrics (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  artist_id        uuid        NOT NULL REFERENCES artist_profiles(id) ON DELETE CASCADE,
  platform_id      uuid        NOT NULL REFERENCES platform_definitions(id) ON DELETE RESTRICT,
  song_id          uuid        REFERENCES songs(id) ON DELETE SET NULL,
  period_start     date        NOT NULL,
  period_end       date        NOT NULL,
  -- Streaming metrics
  total_streams    bigint      NOT NULL DEFAULT 0,
  unique_listeners bigint      NOT NULL DEFAULT 0,
  -- Audience metrics
  total_followers  bigint      NOT NULL DEFAULT 0,
  followers_delta  integer     NOT NULL DEFAULT 0,
  -- Playlist metrics
  playlist_count   integer     NOT NULL DEFAULT 0,
  saves_count      bigint      NOT NULL DEFAULT 0,
  -- Quality metrics
  skip_rate        numeric(6,4) NOT NULL DEFAULT 0,
  completion_rate  numeric(6,4) NOT NULL DEFAULT 0,
  -- Geographic breakdown
  country_breakdown jsonb      NOT NULL DEFAULT '{}'::jsonb,
  raw_data          jsonb      NOT NULL DEFAULT '{}'::jsonb,
  created_at        timestamptz NOT NULL DEFAULT now(),
  UNIQUE (artist_id, platform_id, period_start, period_end, song_id)
);
--> statement-breakpoint

-- ── 4. Indexes ─────────────────────────────────────────────────────────────
-- analytics_snapshots
CREATE INDEX IF NOT EXISTS analytics_snapshots_artist_id_idx     ON analytics_snapshots(artist_id);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS analytics_snapshots_platform_id_idx   ON analytics_snapshots(platform_id);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS analytics_snapshots_date_idx          ON analytics_snapshots(snapshot_date DESC);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS analytics_snapshots_account_date_idx  ON analytics_snapshots(social_account_id, snapshot_date DESC);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS analytics_snapshots_artist_date_idx   ON analytics_snapshots(artist_id, snapshot_date DESC);
--> statement-breakpoint

-- post_analytics
CREATE INDEX IF NOT EXISTS post_analytics_published_post_id_idx  ON post_analytics(published_post_id);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS post_analytics_content_id_idx         ON post_analytics(content_id);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS post_analytics_platform_id_idx        ON post_analytics(platform_id);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS post_analytics_campaign_id_idx        ON post_analytics(campaign_id);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS post_analytics_captured_at_idx        ON post_analytics(captured_at DESC);
--> statement-breakpoint

-- platform_metrics
CREATE INDEX IF NOT EXISTS platform_metrics_artist_id_idx        ON platform_metrics(artist_id);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS platform_metrics_platform_id_idx      ON platform_metrics(platform_id);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS platform_metrics_song_id_idx          ON platform_metrics(song_id);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS platform_metrics_period_idx           ON platform_metrics(period_start DESC, period_end DESC);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS platform_metrics_artist_platform_idx  ON platform_metrics(artist_id, platform_id, period_start DESC);
--> statement-breakpoint

-- ── 5. Seed workflow registry ──────────────────────────────────────────────
INSERT INTO workflow_registry (name, description, event_triggers, webhook_path, is_active) VALUES
  ('analytics-synced', 'Fires when an analytics sync batch completes — triggers AI pattern analysis', ARRAY['analytics.synced'], '/webhook/analytics-sync', true)
ON CONFLICT (name) DO NOTHING;

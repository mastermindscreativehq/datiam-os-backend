-- DATIAM Growth OS — Trend Intelligence
-- Migration 0043
--
-- Purpose: Create the Trend Intelligence module tables.
--   - trend_reports: individual trend records discovered per platform.
--     Scored for relevance, difficulty, and audience overlap with the
--     DATIAM artist catalog.
--   - trend_content_recommendations: links a trend to an existing
--     content_vault asset identified as a fit. Written by the
--     trendIntelligenceQueue worker after relevance scoring.
--
-- Note: The signals module (0009 era) tracks internal content pipeline
-- metrics. This is entirely separate — it monitors external platforms.
--
-- Rollback:
--   DROP TABLE IF EXISTS trend_content_recommendations;
--   DROP TABLE IF EXISTS trend_reports;
--   DROP TYPE IF EXISTS trend_report_status;
--   DROP TYPE IF EXISTS trend_category;

-- ── 1. Enums ───────────────────────────────────────────────────────────────
DO $$ BEGIN
  CREATE TYPE trend_category AS ENUM (
    'sound', 'hashtag', 'challenge', 'meme', 'dance',
    'format', 'topic', 'edit', 'transition', 'filter'
  );
  EXCEPTION WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint

DO $$ BEGIN
  CREATE TYPE trend_report_status AS ENUM ('active', 'expired', 'archived');
  EXCEPTION WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint

-- ── 2. trend_reports ───────────────────────────────────────────────────────
-- All score columns are 0–100 to allow simple ranking and comparison.
-- expires_at is set by the trend collection worker based on trend velocity.
CREATE TABLE IF NOT EXISTS trend_reports (
  id                  uuid                PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  platform_id         uuid                REFERENCES platform_definitions(id) ON DELETE SET NULL,
  category            trend_category      NOT NULL,
  name                text                NOT NULL,
  description         text,
  external_url        text,
  -- Scoring (all 0–100)
  trend_score         numeric(5,2)        NOT NULL DEFAULT 0,
  relevance_score     numeric(5,2)        NOT NULL DEFAULT 0,
  difficulty_score    numeric(5,2)        NOT NULL DEFAULT 0,
  audience_overlap    numeric(5,2)        NOT NULL DEFAULT 0,
  -- AI outputs
  recommended_action  text,
  ai_summary          text,
  -- Lifecycle
  status              trend_report_status NOT NULL DEFAULT 'active',
  detected_at         timestamptz         NOT NULL DEFAULT now(),
  expires_at          timestamptz,
  -- Source data preserved for auditing
  raw_data            jsonb               NOT NULL DEFAULT '{}'::jsonb,
  created_at          timestamptz         NOT NULL DEFAULT now(),
  updated_at          timestamptz         NOT NULL DEFAULT now()
);
--> statement-breakpoint

-- ── 3. trend_content_recommendations ──────────────────────────────────────
-- Maps an active trend to an existing content_vault asset that is a
-- strong fit. is_actioned tracks whether the artist has acted on the tip.
CREATE TABLE IF NOT EXISTS trend_content_recommendations (
  id                     uuid        PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  trend_id               uuid        NOT NULL REFERENCES trend_reports(id) ON DELETE CASCADE,
  content_id             uuid        REFERENCES content_ideas(id) ON DELETE SET NULL,
  relevance_score        numeric(5,2) NOT NULL DEFAULT 0,
  recommendation_reason  text,
  is_actioned            boolean     NOT NULL DEFAULT false,
  actioned_at            timestamptz,
  created_at             timestamptz NOT NULL DEFAULT now()
);
--> statement-breakpoint

-- ── 4. Indexes ─────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS trend_reports_platform_id_idx     ON trend_reports(platform_id);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS trend_reports_category_idx        ON trend_reports(category);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS trend_reports_status_idx          ON trend_reports(status);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS trend_reports_trend_score_idx     ON trend_reports(trend_score DESC);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS trend_reports_relevance_idx       ON trend_reports(relevance_score DESC);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS trend_reports_detected_at_idx     ON trend_reports(detected_at DESC);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS trend_reports_active_idx          ON trend_reports(status, trend_score DESC) WHERE status = 'active';
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS trend_content_recs_trend_id_idx   ON trend_content_recommendations(trend_id);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS trend_content_recs_content_id_idx ON trend_content_recommendations(content_id);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS trend_content_recs_relevance_idx  ON trend_content_recommendations(relevance_score DESC);
--> statement-breakpoint

-- ── 5. Seed workflow registry ──────────────────────────────────────────────
INSERT INTO workflow_registry (name, description, event_triggers, webhook_path, is_active) VALUES
  ('trend-detected', 'Fires when the trend engine identifies a high-relevance trend', ARRAY['trend.detected'], '/webhook/trend-collection', true)
ON CONFLICT (name) DO NOTHING;

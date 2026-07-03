-- DATIAM Release Intel Engine v1
-- Migration 0048
--
-- Purpose: Release Intel is the orchestration layer triggered when a release is
--   created. It persists AI/rule-derived analysis, an executive brief, and the six
--   downstream missions (playlist, sync, fan_growth, content, outreach, analytics)
--   that other modules read and act on.
--   - release_intel_analysis: one row per release (upserted on re-analysis) with
--     commercial/playlist/sync/viral scores and recommended timing/countries/DSPs/rollout.
--   - release_executive_briefs: append-only AI/rule-based executive brief history.
--   - release_missions: persistent, declarative mission records other modules consume.
--
-- Rollback:
--   DROP TABLE IF EXISTS release_missions;
--   DROP TABLE IF EXISTS release_executive_briefs;
--   DROP TABLE IF EXISTS release_intel_analysis;
--   DROP TYPE IF EXISTS release_mission_type;
--   DROP TYPE IF EXISTS release_mission_status;
--   DROP TYPE IF EXISTS release_intel_status;
--   DROP TYPE IF EXISTS release_intel_data_completeness;

-- ── 1. Enums ───────────────────────────────────────────────────────────────
DO $$ BEGIN
  CREATE TYPE release_mission_type AS ENUM (
    'playlist', 'sync', 'fan_growth', 'content', 'outreach', 'analytics'
  );
  EXCEPTION WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint

DO $$ BEGIN
  CREATE TYPE release_mission_status AS ENUM (
    'pending', 'active', 'blocked', 'completed', 'cancelled'
  );
  EXCEPTION WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint

DO $$ BEGIN
  CREATE TYPE release_intel_status AS ENUM (
    'pending', 'analyzing', 'complete', 'failed'
  );
  EXCEPTION WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint

DO $$ BEGIN
  CREATE TYPE release_intel_data_completeness AS ENUM (
    'full', 'metadata_only'
  );
  EXCEPTION WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint

-- ── 2. release_intel_analysis ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS release_intel_analysis (
  id                          uuid                            PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  release_id                  uuid                            NOT NULL REFERENCES releases(id) ON DELETE CASCADE,
  status                      release_intel_status            NOT NULL DEFAULT 'pending',
  commercial_score            numeric(5, 2),
  playlist_score              numeric(5, 2),
  sync_score                  numeric(5, 2),
  viral_score                 numeric(5, 2),
  data_completeness           release_intel_data_completeness NOT NULL DEFAULT 'metadata_only',
  resolved_audio_upload_id    uuid REFERENCES audio_uploads(id) ON DELETE SET NULL,
  recommended_release_window  jsonb,
  recommended_countries       jsonb,
  recommended_dsps            jsonb,
  rollout_strategy            jsonb,
  analysis_version            text NOT NULL DEFAULT 'v1',
  failure_reason              text,
  analyzed_at                 timestamptz,
  created_at                  timestamptz NOT NULL DEFAULT now(),
  updated_at                  timestamptz NOT NULL DEFAULT now(),
  UNIQUE(release_id)
);
--> statement-breakpoint

-- ── 3. release_executive_briefs ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS release_executive_briefs (
  id                        uuid          PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  release_id                uuid          NOT NULL REFERENCES releases(id) ON DELETE CASCADE,
  summary                   text          NOT NULL,
  strengths                 jsonb         NOT NULL DEFAULT '[]'::jsonb,
  weaknesses                jsonb         NOT NULL DEFAULT '[]'::jsonb,
  commercial_outlook        text          NOT NULL,
  viral_outlook             text          NOT NULL,
  sync_outlook              text          NOT NULL,
  playlist_outlook          text          NOT NULL,
  audience_recommendations  jsonb         NOT NULL DEFAULT '[]'::jsonb,
  priority_actions          jsonb         NOT NULL DEFAULT '[]'::jsonb,
  risk_assessment           text          NOT NULL,
  execution_plan_30d        jsonb         NOT NULL DEFAULT '[]'::jsonb,
  used_ai                   boolean       NOT NULL DEFAULT false,
  confidence_score          numeric(3, 2) NOT NULL DEFAULT 0.70,
  created_at                timestamptz   NOT NULL DEFAULT now()
);
--> statement-breakpoint

-- ── 4. release_missions ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS release_missions (
  id                   uuid                    PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  release_id           uuid                    NOT NULL REFERENCES releases(id) ON DELETE CASCADE,
  artist_id            uuid                    REFERENCES artist_profiles(id) ON DELETE SET NULL,
  mission_type         release_mission_type    NOT NULL,
  title                text                    NOT NULL,
  description          text                    NOT NULL,
  status               release_mission_status  NOT NULL DEFAULT 'pending',
  priority             integer                 NOT NULL DEFAULT 0,
  target_metrics       jsonb                   NOT NULL DEFAULT '{}'::jsonb,
  progress_percentage  numeric(5, 2)           NOT NULL DEFAULT 0,
  due_date             date,
  mission_params       jsonb                   NOT NULL DEFAULT '{}'::jsonb,
  created_at           timestamptz             NOT NULL DEFAULT now(),
  updated_at           timestamptz             NOT NULL DEFAULT now(),
  completed_at         timestamptz
);
--> statement-breakpoint

-- ── 5. Indexes ────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS release_intel_analysis_release_id_idx   ON release_intel_analysis(release_id);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS release_intel_analysis_status_idx      ON release_intel_analysis(status);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS release_executive_briefs_release_id_idx ON release_executive_briefs(release_id);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS release_missions_release_id_idx ON release_missions(release_id);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS release_missions_artist_id_idx  ON release_missions(artist_id);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS release_missions_status_idx     ON release_missions(status);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS release_missions_type_idx       ON release_missions(mission_type);

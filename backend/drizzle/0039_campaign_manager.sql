-- DATIAM Growth OS — Campaign Manager
-- Migration 0039
--
-- Purpose: Create the full Campaign Manager subsystem.
--   - 5 new enums: growth_campaign_type, growth_campaign_stage,
--     growth_campaign_status, campaign_task_status, campaign_task_priority.
--   - campaigns table: general-purpose, not release-scoped.
--     (release_campaigns in 0035 remains unchanged.)
--   - campaign_stages: one row per stage per campaign.
--   - campaign_tasks: tasks scoped to a campaign + optional stage.
--   - campaign_kpis: metric targets and actuals per campaign.
--   - campaign_content: many-to-many campaigns ↔ content_ideas.
--   - Adds campaign_id FK to content_ideas (campaigns table now exists).
--
-- Rollback:
--   ALTER TABLE content_ideas DROP COLUMN IF EXISTS campaign_id;
--   DROP TABLE IF EXISTS campaign_content;
--   DROP TABLE IF EXISTS campaign_kpis;
--   DROP TABLE IF EXISTS campaign_tasks;
--   DROP TABLE IF EXISTS campaign_stages;
--   DROP TABLE IF EXISTS campaigns;
--   DROP TYPE IF EXISTS campaign_task_priority;
--   DROP TYPE IF EXISTS campaign_task_status;
--   DROP TYPE IF EXISTS growth_campaign_status;
--   DROP TYPE IF EXISTS growth_campaign_stage;
--   DROP TYPE IF EXISTS growth_campaign_type;

-- ── 1. Enums ───────────────────────────────────────────────────────────────
DO $$ BEGIN
  CREATE TYPE growth_campaign_type AS ENUM (
    'awareness', 'release', 'playlist_push', 'press',
    'social', 'advertising', 'sync', 'custom'
  );
  EXCEPTION WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint

DO $$ BEGIN
  CREATE TYPE growth_campaign_stage AS ENUM (
    'pre_release', 'release_day',
    'week_1', 'week_2', 'week_3',
    'month_1', 'month_2', 'month_3'
  );
  EXCEPTION WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint

DO $$ BEGIN
  CREATE TYPE growth_campaign_status AS ENUM (
    'draft', 'active', 'paused', 'completed', 'cancelled'
  );
  EXCEPTION WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint

DO $$ BEGIN
  CREATE TYPE campaign_task_status AS ENUM (
    'todo', 'in_progress', 'done', 'blocked'
  );
  EXCEPTION WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint

DO $$ BEGIN
  CREATE TYPE campaign_task_priority AS ENUM (
    'low', 'medium', 'high', 'urgent'
  );
  EXCEPTION WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint

-- ── 2. campaigns ───────────────────────────────────────────────────────────
-- General-purpose growth campaigns. Separate from release_campaigns (0035),
-- which is release-scoped with a different lifecycle model.
CREATE TABLE IF NOT EXISTS campaigns (
  id            uuid                    PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  artist_id     uuid                    REFERENCES artist_profiles(id) ON DELETE SET NULL,
  song_id       uuid                    REFERENCES songs(id) ON DELETE SET NULL,
  release_id    uuid                    REFERENCES releases(id) ON DELETE SET NULL,
  title         text                    NOT NULL,
  description   text,
  type          growth_campaign_type    NOT NULL DEFAULT 'release',
  current_stage growth_campaign_stage   DEFAULT 'pre_release',
  status        growth_campaign_status  NOT NULL DEFAULT 'draft',
  start_date    date,
  end_date      date,
  budget        numeric(12,2)           NOT NULL DEFAULT 0,
  currency      text                    NOT NULL DEFAULT 'USD',
  countries     jsonb                   NOT NULL DEFAULT '[]'::jsonb,
  platforms     jsonb                   NOT NULL DEFAULT '[]'::jsonb,
  notes         text,
  metadata      jsonb                   NOT NULL DEFAULT '{}'::jsonb,
  created_by    uuid                    REFERENCES users(id) ON DELETE SET NULL,
  created_at    timestamptz             NOT NULL DEFAULT now(),
  updated_at    timestamptz             NOT NULL DEFAULT now()
);
--> statement-breakpoint

-- ── 3. campaign_stages ─────────────────────────────────────────────────────
-- One row per stage per campaign. UNIQUE enforces a single record per stage.
CREATE TABLE IF NOT EXISTS campaign_stages (
  id           uuid                    PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  campaign_id  uuid                    NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  stage        growth_campaign_stage   NOT NULL,
  status       growth_campaign_status  NOT NULL DEFAULT 'draft',
  start_date   date,
  end_date     date,
  goals        jsonb                   NOT NULL DEFAULT '[]'::jsonb,
  notes        text,
  completed_at timestamptz,
  created_at   timestamptz             NOT NULL DEFAULT now(),
  updated_at   timestamptz             NOT NULL DEFAULT now(),
  UNIQUE (campaign_id, stage)
);
--> statement-breakpoint

-- ── 4. campaign_tasks ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS campaign_tasks (
  id           uuid                    PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  campaign_id  uuid                    NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  stage_id     uuid                    REFERENCES campaign_stages(id) ON DELETE SET NULL,
  title        text                    NOT NULL,
  description  text,
  assigned_to  uuid                    REFERENCES users(id) ON DELETE SET NULL,
  due_date     date,
  status       campaign_task_status    NOT NULL DEFAULT 'todo',
  priority     campaign_task_priority  NOT NULL DEFAULT 'medium',
  completed_at timestamptz,
  created_at   timestamptz             NOT NULL DEFAULT now(),
  updated_at   timestamptz             NOT NULL DEFAULT now()
);
--> statement-breakpoint

-- ── 5. campaign_kpis ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS campaign_kpis (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  campaign_id   uuid        NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  metric_name   text        NOT NULL,
  target_value  numeric(15,2) NOT NULL DEFAULT 0,
  current_value numeric(15,2) NOT NULL DEFAULT 0,
  unit          text        NOT NULL DEFAULT 'count',
  notes         text,
  updated_at    timestamptz NOT NULL DEFAULT now(),
  created_at    timestamptz NOT NULL DEFAULT now()
);
--> statement-breakpoint

-- ── 6. campaign_content — many-to-many campaigns ↔ content_ideas ──────────
CREATE TABLE IF NOT EXISTS campaign_content (
  campaign_id uuid        NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  content_id  uuid        NOT NULL REFERENCES content_ideas(id) ON DELETE CASCADE,
  added_by    uuid        REFERENCES users(id) ON DELETE SET NULL,
  added_at    timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (campaign_id, content_id)
);
--> statement-breakpoint

-- ── 7. Add campaign_id to content_ideas (campaigns table now exists) ───────
ALTER TABLE content_ideas ADD COLUMN IF NOT EXISTS campaign_id uuid REFERENCES campaigns(id) ON DELETE SET NULL;
--> statement-breakpoint

-- ── 8. Indexes ─────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS campaigns_artist_id_idx         ON campaigns(artist_id);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS campaigns_song_id_idx           ON campaigns(song_id);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS campaigns_release_id_idx        ON campaigns(release_id);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS campaigns_status_idx            ON campaigns(status);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS campaigns_type_idx              ON campaigns(type);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS campaigns_current_stage_idx     ON campaigns(current_stage);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS campaigns_created_at_idx        ON campaigns(created_at DESC);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS campaign_stages_campaign_id_idx ON campaign_stages(campaign_id);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS campaign_stages_status_idx      ON campaign_stages(status);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS campaign_tasks_campaign_id_idx  ON campaign_tasks(campaign_id);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS campaign_tasks_stage_id_idx     ON campaign_tasks(stage_id);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS campaign_tasks_assigned_to_idx  ON campaign_tasks(assigned_to);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS campaign_tasks_status_idx       ON campaign_tasks(status);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS campaign_tasks_due_date_idx     ON campaign_tasks(due_date);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS campaign_kpis_campaign_id_idx   ON campaign_kpis(campaign_id);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS campaign_content_content_id_idx ON campaign_content(content_id);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS content_ideas_campaign_id_idx   ON content_ideas(campaign_id);
--> statement-breakpoint

-- ── 9. Seed workflow registry with campaign automation events ──────────────
INSERT INTO workflow_registry (name, description, event_triggers, webhook_path, is_active) VALUES
  ('campaign-created',        'Fires when a Growth OS campaign is created',              ARRAY['campaign.created'],         '/webhook/campaign-automation', true),
  ('campaign-stage-changed',  'Fires when a campaign transitions to the next stage',     ARRAY['campaign.stage.changed'],   '/webhook/campaign-automation', true),
  ('campaign-completed',      'Fires when a campaign completes — triggers AI retrospective', ARRAY['campaign.completed'],   '/webhook/learning-engine',     true)
ON CONFLICT (name) DO NOTHING;

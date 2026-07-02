-- DATIAM Growth OS — System Settings & General Tasks
-- Migration 0047
--
-- Purpose: Create system-wide configuration and a general task table.
--   - system_settings: key-value store for feature flags and config.
--     Seeded with default Growth OS settings.
--   - general_tasks: artist/campaign tasks not tied to a release.
--     Complements release_tasks (release-scoped) without replacing it.
--
-- Rollback:
--   DROP TABLE IF EXISTS general_tasks;
--   DROP TABLE IF EXISTS system_settings;
--   DROP TYPE IF EXISTS general_task_priority;
--   DROP TYPE IF EXISTS general_task_status;

-- ── 1. Enums ───────────────────────────────────────────────────────────────
DO $$ BEGIN
  CREATE TYPE general_task_status AS ENUM (
    'todo', 'in_progress', 'done', 'blocked', 'cancelled'
  );
  EXCEPTION WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint

DO $$ BEGIN
  CREATE TYPE general_task_priority AS ENUM (
    'low', 'medium', 'high', 'urgent'
  );
  EXCEPTION WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint

-- ── 2. system_settings ─────────────────────────────────────────────────────
-- key is the natural unique identifier (e.g. 'growth_os.enabled').
-- value is JSONB to support booleans, numbers, strings, and arrays.
-- is_public = true means the frontend can read it unauthenticated.
CREATE TABLE IF NOT EXISTS system_settings (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  key         text        NOT NULL UNIQUE,
  value       jsonb       NOT NULL DEFAULT '{}'::jsonb,
  description text,
  is_public   boolean     NOT NULL DEFAULT false,
  updated_by  uuid        REFERENCES users(id) ON DELETE SET NULL,
  updated_at  timestamptz NOT NULL DEFAULT now(),
  created_at  timestamptz NOT NULL DEFAULT now()
);
--> statement-breakpoint

-- Seed default Growth OS configuration
INSERT INTO system_settings (key, value, description, is_public) VALUES
  ('growth_os.enabled',
   'true'::jsonb,
   'Master switch — enables all Growth OS modules globally',
   false),
  ('growth_os.ai_generation.enabled',
   'true'::jsonb,
   'Enable AI caption, hashtag, and CTA generation via Anthropic',
   false),
  ('growth_os.analytics.sync_interval_hours',
   '24'::jsonb,
   'Hours between scheduled analytics sync jobs',
   false),
  ('growth_os.trends.collection_interval_hours',
   '1'::jsonb,
   'Hours between trend collection runs',
   false),
  ('growth_os.publishing.max_retries',
   '3'::jsonb,
   'Maximum retry attempts for a failed scheduled post before moving to DLQ',
   false),
  ('growth_os.campaigns.auto_create_from_song',
   'true'::jsonb,
   'Automatically create a growth campaign when a new song is created',
   false),
  ('growth_os.learning_engine.campaign_retro_enabled',
   'true'::jsonb,
   'Run AI retrospective analysis when a campaign completes',
   false)
ON CONFLICT (key) DO NOTHING;
--> statement-breakpoint

-- ── 3. general_tasks ───────────────────────────────────────────────────────
-- Complements release_tasks (release-scoped) without replacing it.
-- Linked optionally to an artist and/or campaign for context.
CREATE TABLE IF NOT EXISTS general_tasks (
  id           uuid                  PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  artist_id    uuid                  REFERENCES artist_profiles(id) ON DELETE SET NULL,
  campaign_id  uuid                  REFERENCES campaigns(id) ON DELETE SET NULL,
  assigned_to  uuid                  REFERENCES users(id) ON DELETE SET NULL,
  created_by   uuid                  REFERENCES users(id) ON DELETE SET NULL,
  title        text                  NOT NULL,
  description  text,
  due_date     date,
  priority     general_task_priority NOT NULL DEFAULT 'medium',
  status       general_task_status   NOT NULL DEFAULT 'todo',
  tags         jsonb                 NOT NULL DEFAULT '[]'::jsonb,
  completed_at timestamptz,
  metadata     jsonb                 NOT NULL DEFAULT '{}'::jsonb,
  created_at   timestamptz           NOT NULL DEFAULT now(),
  updated_at   timestamptz           NOT NULL DEFAULT now()
);
--> statement-breakpoint

-- ── 4. Indexes ─────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS system_settings_key_idx          ON system_settings(key);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS system_settings_public_idx       ON system_settings(is_public) WHERE is_public = true;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS general_tasks_artist_id_idx      ON general_tasks(artist_id);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS general_tasks_campaign_id_idx    ON general_tasks(campaign_id);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS general_tasks_assigned_to_idx    ON general_tasks(assigned_to);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS general_tasks_status_idx         ON general_tasks(status);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS general_tasks_priority_idx       ON general_tasks(priority);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS general_tasks_due_date_idx       ON general_tasks(due_date);
--> statement-breakpoint
-- Composite: find open tasks for an artist sorted by urgency
CREATE INDEX IF NOT EXISTS general_tasks_artist_status_idx  ON general_tasks(artist_id, status, priority)
  WHERE status NOT IN ('done', 'cancelled');

-- DATIAM Growth OS — Notifications
-- Migration 0046
--
-- Purpose: Create a system-wide user notification inbox.
--   - notifications: one row per notification per user.
--     read_at = NULL means unread. dismissed_at soft-deletes the record.
--
-- This is distinct from release_alerts (0035), which is operational and
-- release-scoped. notifications is the user-facing inbox for all modules.
--
-- The existing notificationQueue (BullMQ) is extended to write here.
-- No new queue is required for this table.
--
-- Rollback:
--   DROP TABLE IF EXISTS notifications;
--   DROP TYPE IF EXISTS notification_category;
--   DROP TYPE IF EXISTS notification_type;

-- ── 1. Enums ───────────────────────────────────────────────────────────────
DO $$ BEGIN
  CREATE TYPE notification_type AS ENUM (
    'info', 'success', 'warning', 'alert'
  );
  EXCEPTION WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint

DO $$ BEGIN
  CREATE TYPE notification_category AS ENUM (
    'campaign', 'content', 'analytics', 'trend', 'fan',
    'publishing', 'system', 'deal', 'release', 'payment'
  );
  EXCEPTION WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint

-- ── 2. notifications ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS notifications (
  id             uuid                   PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  user_id        uuid                   NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type           notification_type      NOT NULL DEFAULT 'info',
  category       notification_category  NOT NULL DEFAULT 'system',
  title          text                   NOT NULL,
  body           text,
  -- entity_type / entity_id allow deep-link navigation in the frontend
  entity_type    text,
  entity_id      uuid,
  action_url     text,
  icon           text,
  read_at        timestamptz,
  dismissed_at   timestamptz,
  metadata       jsonb                  NOT NULL DEFAULT '{}'::jsonb,
  created_at     timestamptz            NOT NULL DEFAULT now()
);
--> statement-breakpoint

-- ── 3. Indexes ─────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS notifications_user_id_idx      ON notifications(user_id);
--> statement-breakpoint
-- Partial index used by the "unread count" query — avoids full table scan
CREATE INDEX IF NOT EXISTS notifications_user_unread_idx  ON notifications(user_id, created_at DESC)
  WHERE read_at IS NULL AND dismissed_at IS NULL;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS notifications_category_idx     ON notifications(category);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS notifications_type_idx         ON notifications(type);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS notifications_created_at_idx   ON notifications(created_at DESC);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS notifications_entity_idx       ON notifications(entity_type, entity_id);
--> statement-breakpoint

-- ── 4. Seed workflow registry ──────────────────────────────────────────────
INSERT INTO workflow_registry (name, description, event_triggers, webhook_path, is_active) VALUES
  ('notification-engine', 'Routes major platform events into the user notification inbox',
   ARRAY[
     'campaign.created', 'campaign.stage.changed', 'campaign.completed',
     'content.published', 'post.publish.failed',
     'analytics.synced', 'trend.detected'
   ],
   '/webhook/notification-engine', true)
ON CONFLICT (name) DO NOTHING;

-- DATIAM Automation Layer v1
-- Migration 0036
-- Workflow registry + automation run enhancements

CREATE TABLE IF NOT EXISTS workflow_registry (
  id                uuid        PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  name              text        NOT NULL UNIQUE,
  description       text,
  event_triggers    text[]      NOT NULL DEFAULT '{}',
  n8n_workflow_id   text,
  webhook_path      text,
  is_active         boolean     NOT NULL DEFAULT true,
  last_run_at       timestamptz,
  last_run_status   text,
  total_runs        integer     NOT NULL DEFAULT 0,
  success_count     integer     NOT NULL DEFAULT 0,
  failed_count      integer     NOT NULL DEFAULT 0,
  metadata          jsonb,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);
--> statement-breakpoint

ALTER TABLE automation_runs
  ADD COLUMN IF NOT EXISTS retry_count          integer     NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS max_retries          integer     NOT NULL DEFAULT 3,
  ADD COLUMN IF NOT EXISTS error_message        text,
  ADD COLUMN IF NOT EXISTS duration_ms          integer,
  ADD COLUMN IF NOT EXISTS triggered_by_event   text,
  ADD COLUMN IF NOT EXISTS workflow_registry_id uuid        REFERENCES workflow_registry(id) ON DELETE SET NULL;
--> statement-breakpoint

CREATE INDEX IF NOT EXISTS workflow_registry_name_idx        ON workflow_registry(name);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS workflow_registry_active_idx      ON workflow_registry(is_active);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS automation_runs_registry_id_idx   ON automation_runs(workflow_registry_id);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS automation_runs_triggered_by_idx  ON automation_runs(triggered_by_event);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS automation_runs_created_at_idx    ON automation_runs(created_at);
--> statement-breakpoint

-- Seed the 5 Release Intelligence webhook workflows
INSERT INTO workflow_registry (name, description, event_triggers, webhook_path, is_active)
VALUES
  ('release-created',           'Fires when a new release is created in DATIAM',                ARRAY['release.created'],           '/webhook/release-intelligence', true),
  ('release-updated',           'Fires when a release record is updated',                       ARRAY['release.updated'],           '/webhook/release-intelligence', true),
  ('release-published',         'Fires when a release goes live / is published to DSPs',        ARRAY['release.published'],         '/webhook/release-intelligence', true),
  ('release-campaign-started',  'Fires when a release marketing campaign becomes active',       ARRAY['release.campaign.started'],  '/webhook/release-intelligence', true),
  ('release-campaign-completed','Fires when a release marketing campaign is completed',         ARRAY['release.campaign.completed'],'/webhook/release-intelligence', true)
ON CONFLICT (name) DO NOTHING;

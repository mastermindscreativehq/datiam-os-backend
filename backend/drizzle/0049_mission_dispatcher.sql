-- DATIAM Release Intel — Mission Dispatcher
-- Migration 0049
--
-- Purpose: turns release_missions from declarative work-items into an
--   executable pipeline. Adds BullMQ/n8n execution tracking to each mission,
--   links automation_runs back to the mission that triggered them (so
--   execution history is queried, not duplicated), and extends
--   workflow_registry with the retry/timeout/priority/contract metadata the
--   dispatcher needs per workflow.
--
-- Rollback:
--   ALTER TABLE automation_runs DROP COLUMN IF EXISTS mission_id;
--   ALTER TABLE release_missions
--     DROP COLUMN IF EXISTS owner,
--     DROP COLUMN IF EXISTS started_at,
--     DROP COLUMN IF EXISTS workflow_id,
--     DROP COLUMN IF EXISTS queue_job_id,
--     DROP COLUMN IF EXISTS automation_run_id,
--     DROP COLUMN IF EXISTS retry_count,
--     DROP COLUMN IF EXISTS last_error;
--   ALTER TABLE workflow_registry
--     DROP COLUMN IF EXISTS retry_policy,
--     DROP COLUMN IF EXISTS timeout_ms,
--     DROP COLUMN IF EXISTS priority,
--     DROP COLUMN IF EXISTS required_inputs,
--     DROP COLUMN IF EXISTS expected_outputs,
--     DROP COLUMN IF EXISTS health_status,
--     DROP COLUMN IF EXISTS version;
--   -- release_mission_status enum values are additive only; Postgres cannot
--   -- drop individual enum values without recreating the type, so no rollback
--   -- statement is provided for the ADD VALUE statements below.

-- ── 1. Extend release_mission_status enum (additive — existing values untouched) ──
ALTER TYPE release_mission_status ADD VALUE IF NOT EXISTS 'queued';
--> statement-breakpoint
ALTER TYPE release_mission_status ADD VALUE IF NOT EXISTS 'running';
--> statement-breakpoint
ALTER TYPE release_mission_status ADD VALUE IF NOT EXISTS 'waiting';
--> statement-breakpoint
ALTER TYPE release_mission_status ADD VALUE IF NOT EXISTS 'failed';
--> statement-breakpoint
ALTER TYPE release_mission_status ADD VALUE IF NOT EXISTS 'retrying';
--> statement-breakpoint

-- ── 2. release_missions — dispatcher execution tracking ─────────────────────
ALTER TABLE release_missions ADD COLUMN IF NOT EXISTS owner text;
--> statement-breakpoint
ALTER TABLE release_missions ADD COLUMN IF NOT EXISTS started_at timestamptz;
--> statement-breakpoint
ALTER TABLE release_missions ADD COLUMN IF NOT EXISTS workflow_id uuid REFERENCES workflow_registry(id) ON DELETE SET NULL;
--> statement-breakpoint
ALTER TABLE release_missions ADD COLUMN IF NOT EXISTS queue_job_id text;
--> statement-breakpoint
ALTER TABLE release_missions ADD COLUMN IF NOT EXISTS automation_run_id uuid REFERENCES automation_runs(id) ON DELETE SET NULL;
--> statement-breakpoint
ALTER TABLE release_missions ADD COLUMN IF NOT EXISTS retry_count integer NOT NULL DEFAULT 0;
--> statement-breakpoint
ALTER TABLE release_missions ADD COLUMN IF NOT EXISTS last_error text;
--> statement-breakpoint

CREATE INDEX IF NOT EXISTS release_missions_workflow_id_idx ON release_missions(workflow_id);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS release_missions_automation_run_id_idx ON release_missions(automation_run_id);
--> statement-breakpoint

-- ── 3. automation_runs — link a run back to the mission that dispatched it ──
-- This is what "execution_history" reads from (join, not a duplicated column).
ALTER TABLE automation_runs ADD COLUMN IF NOT EXISTS mission_id uuid REFERENCES release_missions(id) ON DELETE SET NULL;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS automation_runs_mission_id_idx ON automation_runs(mission_id);
--> statement-breakpoint

-- ── 4. workflow_registry — dispatcher contract metadata per workflow ────────
ALTER TABLE workflow_registry ADD COLUMN IF NOT EXISTS retry_policy jsonb NOT NULL DEFAULT '{"max_retries": 3, "backoff": "exponential", "base_delay_ms": 2000}'::jsonb;
--> statement-breakpoint
ALTER TABLE workflow_registry ADD COLUMN IF NOT EXISTS timeout_ms integer NOT NULL DEFAULT 8000;
--> statement-breakpoint
ALTER TABLE workflow_registry ADD COLUMN IF NOT EXISTS priority integer NOT NULL DEFAULT 0;
--> statement-breakpoint
ALTER TABLE workflow_registry ADD COLUMN IF NOT EXISTS required_inputs jsonb NOT NULL DEFAULT '[]'::jsonb;
--> statement-breakpoint
ALTER TABLE workflow_registry ADD COLUMN IF NOT EXISTS expected_outputs jsonb NOT NULL DEFAULT '[]'::jsonb;
--> statement-breakpoint
ALTER TABLE workflow_registry ADD COLUMN IF NOT EXISTS health_status text NOT NULL DEFAULT 'unknown';
--> statement-breakpoint
ALTER TABLE workflow_registry ADD COLUMN IF NOT EXISTS version text NOT NULL DEFAULT 'v1';

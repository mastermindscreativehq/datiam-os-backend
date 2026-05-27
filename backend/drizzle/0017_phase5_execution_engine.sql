-- Phase 5: Execution Engine

-- ── Engine versioning on existing tables ────────────────────────────────────

ALTER TABLE sonic_director_recommendations
  ADD COLUMN IF NOT EXISTS recommendation_version text NOT NULL DEFAULT 'rec-v1',
  ADD COLUMN IF NOT EXISTS accepted boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS accepted_at timestamp with time zone;

ALTER TABLE sonic_missions
  ADD COLUMN IF NOT EXISTS scoring_version text NOT NULL DEFAULT 'scoring-v1';

ALTER TABLE sonic_release_simulations
  ADD COLUMN IF NOT EXISTS algorithm_version text NOT NULL DEFAULT 'sim-v1';

-- ── Execution Plans ──────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS sonic_execution_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  artist_id uuid NOT NULL REFERENCES artist_profiles(id) ON DELETE CASCADE,
  recommendation_id uuid REFERENCES sonic_director_recommendations(id) ON DELETE SET NULL,
  mission_id uuid REFERENCES sonic_missions(id) ON DELETE SET NULL,
  category text NOT NULL,
  title text NOT NULL DEFAULT '',
  objective text NOT NULL DEFAULT '',
  production_tasks jsonb,
  timeline_days integer NOT NULL DEFAULT 14,
  status text NOT NULL DEFAULT 'pending',
  completion_score numeric(4,2) NOT NULL DEFAULT '0',
  scoring_version text NOT NULL DEFAULT 'scoring-v1',
  algorithm_version text NOT NULL DEFAULT 'exec-v1',
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  completed_at timestamp with time zone
);

CREATE INDEX IF NOT EXISTS sonic_exec_plans_artist_id_idx ON sonic_execution_plans(artist_id);
CREATE INDEX IF NOT EXISTS sonic_exec_plans_status_idx ON sonic_execution_plans(status);
CREATE INDEX IF NOT EXISTS sonic_exec_plans_category_idx ON sonic_execution_plans(category);
CREATE INDEX IF NOT EXISTS sonic_exec_plans_rec_id_idx ON sonic_execution_plans(recommendation_id);

-- ── Execution Milestones ─────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS sonic_execution_milestones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id uuid NOT NULL REFERENCES sonic_execution_plans(id) ON DELETE CASCADE,
  artist_id uuid NOT NULL REFERENCES artist_profiles(id) ON DELETE CASCADE,
  title text NOT NULL DEFAULT '',
  description text NOT NULL DEFAULT '',
  target_day integer NOT NULL DEFAULT 7,
  completion_criteria jsonb,
  status text NOT NULL DEFAULT 'pending',
  completed_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS sonic_exec_milestones_plan_id_idx ON sonic_execution_milestones(plan_id);
CREATE INDEX IF NOT EXISTS sonic_exec_milestones_status_idx ON sonic_execution_milestones(status);

-- ── Execution Checkpoints ────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS sonic_execution_checkpoints (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id uuid NOT NULL REFERENCES sonic_execution_plans(id) ON DELETE CASCADE,
  milestone_id uuid REFERENCES sonic_execution_milestones(id) ON DELETE SET NULL,
  checkpoint_type text NOT NULL DEFAULT 'manual',
  data_snapshot jsonb,
  score_at_checkpoint numeric(4,2) NOT NULL DEFAULT '0',
  notes text NOT NULL DEFAULT '',
  created_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS sonic_exec_checkpoints_plan_id_idx ON sonic_execution_checkpoints(plan_id);

-- ── Session Mode Diagnostics ─────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS sonic_session_diagnostics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  artist_id uuid NOT NULL REFERENCES artist_profiles(id) ON DELETE CASCADE,
  session_id uuid REFERENCES creative_sessions(id) ON DELETE SET NULL,
  stagnation_detected boolean NOT NULL DEFAULT false,
  over_density_detected boolean NOT NULL DEFAULT false,
  emotional_flatness_detected boolean NOT NULL DEFAULT false,
  harmonic_repetition_detected boolean NOT NULL DEFAULT false,
  weak_transitions_detected boolean NOT NULL DEFAULT false,
  diagnostic_score numeric(4,2) NOT NULL DEFAULT '1.00',
  recommendations jsonb,
  blueprint_window_size integer NOT NULL DEFAULT 10,
  analyzed_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS sonic_session_diagnostics_artist_id_idx ON sonic_session_diagnostics(artist_id);
CREATE INDEX IF NOT EXISTS sonic_session_diagnostics_analyzed_at_idx ON sonic_session_diagnostics(analyzed_at);

-- ── Event Bus Audit Log ──────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS sonic_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  artist_id uuid REFERENCES artist_profiles(id) ON DELETE SET NULL,
  event_type text NOT NULL,
  payload jsonb,
  processed boolean NOT NULL DEFAULT false,
  processed_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS sonic_events_artist_id_idx ON sonic_events(artist_id);
CREATE INDEX IF NOT EXISTS sonic_events_event_type_idx ON sonic_events(event_type);
CREATE INDEX IF NOT EXISTS sonic_events_processed_idx ON sonic_events(processed);
CREATE INDEX IF NOT EXISTS sonic_events_created_at_idx ON sonic_events(created_at);

-- ── Queue Job Tracking ───────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS sonic_queue_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  queue_name text NOT NULL,
  job_id text,
  job_type text NOT NULL,
  artist_id uuid REFERENCES artist_profiles(id) ON DELETE SET NULL,
  payload jsonb,
  status text NOT NULL DEFAULT 'pending',
  attempts integer NOT NULL DEFAULT 0,
  error text,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  completed_at timestamp with time zone
);

CREATE INDEX IF NOT EXISTS sonic_queue_jobs_queue_name_idx ON sonic_queue_jobs(queue_name);
CREATE INDEX IF NOT EXISTS sonic_queue_jobs_status_idx ON sonic_queue_jobs(status);
CREATE INDEX IF NOT EXISTS sonic_queue_jobs_artist_id_idx ON sonic_queue_jobs(artist_id);
CREATE INDEX IF NOT EXISTS sonic_queue_jobs_created_at_idx ON sonic_queue_jobs(created_at);

-- ── Platform Ingestion Signals (Spotify / TikTok / YouTube ready) ────────────

CREATE TABLE IF NOT EXISTS platform_ingestion_signals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  artist_id uuid NOT NULL REFERENCES artist_profiles(id) ON DELETE CASCADE,
  platform text NOT NULL,
  signal_type text NOT NULL,
  track_id text,
  track_title text,
  value numeric(12,4) NOT NULL DEFAULT '0',
  recorded_at timestamp with time zone DEFAULT now() NOT NULL,
  ingested_at timestamp with time zone DEFAULT now() NOT NULL,
  metadata jsonb
);

CREATE INDEX IF NOT EXISTS platform_signals_artist_id_idx ON platform_ingestion_signals(artist_id);
CREATE INDEX IF NOT EXISTS platform_signals_platform_idx ON platform_ingestion_signals(platform);
CREATE INDEX IF NOT EXISTS platform_signals_signal_type_idx ON platform_ingestion_signals(signal_type);
CREATE INDEX IF NOT EXISTS platform_signals_recorded_at_idx ON platform_ingestion_signals(recorded_at);

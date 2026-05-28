-- 0018_sonic_world_full_repair.sql
-- Idempotent repair: backfills all schema changes from migrations 0014-0017
-- which were never registered in the Drizzle journal and never applied to production.
-- Every statement uses IF NOT EXISTS / ADD COLUMN IF NOT EXISTS so this is safe
-- to re-run or to run on a database that already has some of these objects.

-- ── 0014: Sonic World Stabilization audit columns ────────────────────────────

ALTER TABLE sonic_world_blueprints
  ADD COLUMN IF NOT EXISTS raw_generation       jsonb,
  ADD COLUMN IF NOT EXISTS repaired_generation  jsonb,
  ADD COLUMN IF NOT EXISTS validation_report    jsonb,
  ADD COLUMN IF NOT EXISTS confidence_score     numeric(4,2) NOT NULL DEFAULT 1.00,
  ADD COLUMN IF NOT EXISTS repair_count         integer      NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS fallback_used        boolean      NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS generation_quality   text         NOT NULL DEFAULT 'excellent';

CREATE INDEX IF NOT EXISTS sw_blueprints_quality_idx      ON sonic_world_blueprints (generation_quality);
CREATE INDEX IF NOT EXISTS sw_blueprints_repair_count_idx ON sonic_world_blueprints (repair_count);

-- ── 0015: Sonic Memory Engine ────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS sonic_memory (
  id                           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  blueprint_id                 uuid NOT NULL UNIQUE REFERENCES sonic_world_blueprints(id) ON DELETE CASCADE,
  artist_id                    uuid NOT NULL REFERENCES artist_profiles(id) ON DELETE CASCADE,
  emotion_at_generation        text NOT NULL DEFAULT '',
  intention_at_generation      text NOT NULL DEFAULT '',
  bpm                          integer NOT NULL DEFAULT 90,
  musical_key                  text NOT NULL DEFAULT 'C',
  scale                        text NOT NULL DEFAULT 'Minor',
  primary_genre                text NOT NULL DEFAULT '',
  secondary_genre              text NOT NULL DEFAULT '',
  cinematic_density            integer NOT NULL DEFAULT 50,
  spiritual_intensity          integer NOT NULL DEFAULT 50,
  emotional_rawness            integer NOT NULL DEFAULT 50,
  commercial_accessibility     integer NOT NULL DEFAULT 50,
  darkness_vs_hope             integer NOT NULL DEFAULT 50,
  underground_vs_mainstream    integer NOT NULL DEFAULT 50,
  organic_vs_synthetic         integer NOT NULL DEFAULT 50,
  coherence_score              numeric(4,2) NOT NULL DEFAULT 0.85,
  confidence_score             numeric(4,2) NOT NULL DEFAULT 1.00,
  generation_quality           text NOT NULL DEFAULT 'excellent',
  emotional_intensity_score    numeric(4,2) NOT NULL DEFAULT 0.50,
  commercial_potential_score   numeric(4,2) NOT NULL DEFAULT 0.50,
  spiritual_alignment_score    numeric(4,2) NOT NULL DEFAULT 0.50,
  replayability_score          numeric(4,2) NOT NULL DEFAULT 0.50,
  memory_vector                jsonb,
  rl_weight                    numeric(4,2) NOT NULL DEFAULT 1.00,
  ingested_at                  timestamp with time zone DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS sonic_memory_blueprint_id_idx ON sonic_memory(blueprint_id);
CREATE INDEX IF NOT EXISTS sonic_memory_artist_id_idx    ON sonic_memory(artist_id);
CREATE INDEX IF NOT EXISTS sonic_memory_ingested_at_idx  ON sonic_memory(ingested_at);

CREATE TABLE IF NOT EXISTS sonic_preferences (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  blueprint_id    uuid NOT NULL REFERENCES sonic_world_blueprints(id) ON DELETE CASCADE,
  artist_id       uuid NOT NULL REFERENCES artist_profiles(id) ON DELETE CASCADE,
  preference_type text NOT NULL,
  metadata        jsonb,
  created_at      timestamp with time zone DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS sonic_preferences_blueprint_id_idx ON sonic_preferences(blueprint_id);
CREATE INDEX IF NOT EXISTS sonic_preferences_artist_id_idx    ON sonic_preferences(artist_id);
CREATE INDEX IF NOT EXISTS sonic_preferences_type_idx         ON sonic_preferences(preference_type);

CREATE TABLE IF NOT EXISTS sonic_patterns (
  id                           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  artist_id                    uuid NOT NULL UNIQUE REFERENCES artist_profiles(id) ON DELETE CASCADE,
  bpm_distribution             jsonb,
  key_distribution             jsonb,
  scale_distribution           jsonb,
  emotion_tendencies           jsonb,
  commercial_tendencies        jsonb,
  atmospheric_patterns         jsonb,
  vocal_architecture_trends    jsonb,
  dominant_emotion             text,
  dominant_key                 text,
  dominant_scale               text,
  dominant_genre               text,
  avg_bpm                      numeric(6,2),
  avg_coherence                numeric(4,2),
  avg_commercial_accessibility numeric(4,2),
  avg_spiritual_intensity      numeric(4,2),
  avg_emotional_rawness        numeric(4,2),
  total_blueprints_analyzed    integer NOT NULL DEFAULT 0,
  last_analyzed_at             timestamp with time zone DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS sonic_patterns_artist_id_idx ON sonic_patterns(artist_id);

CREATE TABLE IF NOT EXISTS sonic_artist_profiles (
  id                              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  artist_id                       uuid NOT NULL UNIQUE REFERENCES artist_profiles(id) ON DELETE CASCADE,
  profile_summary                 text NOT NULL DEFAULT '',
  sonic_identity_tags             jsonb,
  dominant_genres                 jsonb,
  evolution_stage                 text NOT NULL DEFAULT 'emerging',
  strongest_coherence_id          uuid REFERENCES sonic_world_blueprints(id) ON DELETE SET NULL,
  highest_emotional_intensity_id  uuid REFERENCES sonic_world_blueprints(id) ON DELETE SET NULL,
  highest_commercial_id           uuid REFERENCES sonic_world_blueprints(id) ON DELETE SET NULL,
  most_spiritual_id               uuid REFERENCES sonic_world_blueprints(id) ON DELETE SET NULL,
  most_replayable_id              uuid REFERENCES sonic_world_blueprints(id) ON DELETE SET NULL,
  computed_at                     timestamp with time zone DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS sonic_artist_profiles_artist_id_idx ON sonic_artist_profiles(artist_id);

-- ── 0016: Sonic Director Engine ──────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS sonic_director_recommendations (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  artist_id            uuid NOT NULL REFERENCES artist_profiles(id) ON DELETE CASCADE,
  recommendation_type  text NOT NULL,
  title                text NOT NULL DEFAULT '',
  description          text NOT NULL DEFAULT '',
  rationale            text NOT NULL DEFAULT '',
  confidence_score     numeric(4,2) NOT NULL DEFAULT 0.75,
  priority_rank        integer NOT NULL DEFAULT 1,
  target_emotion       text,
  target_bpm_min       integer,
  target_bpm_max       integer,
  target_key           text,
  target_scale         text,
  target_genre         text,
  direction_parameters jsonb,
  based_on_count       integer NOT NULL DEFAULT 0,
  rl_metadata          jsonb,
  generated_at         timestamp with time zone DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS sonic_director_recs_artist_id_idx    ON sonic_director_recommendations(artist_id);
CREATE INDEX IF NOT EXISTS sonic_director_recs_type_idx         ON sonic_director_recommendations(recommendation_type);
CREATE INDEX IF NOT EXISTS sonic_director_recs_generated_at_idx ON sonic_director_recommendations(generated_at);

CREATE TABLE IF NOT EXISTS sonic_missions (
  id                       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  artist_id                uuid NOT NULL REFERENCES artist_profiles(id) ON DELETE CASCADE,
  mission_type             text NOT NULL,
  title                    text NOT NULL DEFAULT '',
  description              text NOT NULL DEFAULT '',
  status                   text NOT NULL DEFAULT 'active',
  start_score              numeric(5,2) NOT NULL DEFAULT 0,
  current_score            numeric(5,2) NOT NULL DEFAULT 0,
  target_score             numeric(5,2) NOT NULL DEFAULT 75,
  progress_percentage      numeric(5,2) NOT NULL DEFAULT 0,
  blueprint_count_at_start integer NOT NULL DEFAULT 0,
  blueprint_milestones     jsonb,
  mission_parameters       jsonb,
  created_at               timestamp with time zone DEFAULT now() NOT NULL,
  updated_at               timestamp with time zone DEFAULT now() NOT NULL,
  completed_at             timestamp with time zone
);

CREATE INDEX IF NOT EXISTS sonic_missions_artist_id_idx ON sonic_missions(artist_id);
CREATE INDEX IF NOT EXISTS sonic_missions_status_idx    ON sonic_missions(status);
CREATE INDEX IF NOT EXISTS sonic_missions_type_idx      ON sonic_missions(mission_type);

CREATE TABLE IF NOT EXISTS sonic_gap_analysis (
  id                        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  artist_id                 uuid NOT NULL UNIQUE REFERENCES artist_profiles(id) ON DELETE CASCADE,
  underexplored_emotions    jsonb,
  overused_bpm_ranges       jsonb,
  repetitive_atmospheres    jsonb,
  harmonic_stagnation       jsonb,
  gap_score                 numeric(4,2) NOT NULL DEFAULT 0,
  total_blueprints_analyzed integer NOT NULL DEFAULT 0,
  analyzed_at               timestamp with time zone DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS sonic_gap_analysis_artist_id_idx ON sonic_gap_analysis(artist_id);

CREATE TABLE IF NOT EXISTS sonic_release_simulations (
  id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  blueprint_id            uuid NOT NULL UNIQUE REFERENCES sonic_world_blueprints(id) ON DELETE CASCADE,
  artist_id               uuid NOT NULL REFERENCES artist_profiles(id) ON DELETE CASCADE,
  commercial_score        numeric(5,2) NOT NULL DEFAULT 0,
  sync_score              numeric(5,2) NOT NULL DEFAULT 0,
  crowd_energy            numeric(5,2) NOT NULL DEFAULT 0,
  replayability_prediction numeric(5,2) NOT NULL DEFAULT 0,
  emotional_stickiness    numeric(5,2) NOT NULL DEFAULT 0,
  cinematic_potential     numeric(5,2) NOT NULL DEFAULT 0,
  overall_release_score   numeric(5,2) NOT NULL DEFAULT 0,
  sync_tags               jsonb,
  producer_compatibility  jsonb,
  simulation_notes        text NOT NULL DEFAULT '',
  confidence_score        numeric(4,2) NOT NULL DEFAULT 0.80,
  rl_metadata             jsonb,
  simulated_at            timestamp with time zone DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS sonic_release_sims_blueprint_id_idx ON sonic_release_simulations(blueprint_id);
CREATE INDEX IF NOT EXISTS sonic_release_sims_artist_id_idx    ON sonic_release_simulations(artist_id);

-- ── 0017: Phase 5 Execution Engine columns + tables ─────────────────────────

ALTER TABLE sonic_director_recommendations
  ADD COLUMN IF NOT EXISTS recommendation_version text NOT NULL DEFAULT 'rec-v1',
  ADD COLUMN IF NOT EXISTS accepted               boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS accepted_at            timestamp with time zone;

ALTER TABLE sonic_missions
  ADD COLUMN IF NOT EXISTS scoring_version text NOT NULL DEFAULT 'scoring-v1';

ALTER TABLE sonic_release_simulations
  ADD COLUMN IF NOT EXISTS algorithm_version text NOT NULL DEFAULT 'sim-v1';

CREATE TABLE IF NOT EXISTS sonic_execution_plans (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  artist_id         uuid NOT NULL REFERENCES artist_profiles(id) ON DELETE CASCADE,
  recommendation_id uuid REFERENCES sonic_director_recommendations(id) ON DELETE SET NULL,
  mission_id        uuid REFERENCES sonic_missions(id) ON DELETE SET NULL,
  category          text NOT NULL,
  title             text NOT NULL DEFAULT '',
  objective         text NOT NULL DEFAULT '',
  production_tasks  jsonb,
  timeline_days     integer NOT NULL DEFAULT 14,
  status            text NOT NULL DEFAULT 'pending',
  completion_score  numeric(4,2) NOT NULL DEFAULT 0,
  scoring_version   text NOT NULL DEFAULT 'scoring-v1',
  algorithm_version text NOT NULL DEFAULT 'exec-v1',
  created_at        timestamp with time zone DEFAULT now() NOT NULL,
  updated_at        timestamp with time zone DEFAULT now() NOT NULL,
  completed_at      timestamp with time zone
);

CREATE INDEX IF NOT EXISTS sonic_exec_plans_artist_id_idx ON sonic_execution_plans(artist_id);
CREATE INDEX IF NOT EXISTS sonic_exec_plans_status_idx    ON sonic_execution_plans(status);
CREATE INDEX IF NOT EXISTS sonic_exec_plans_category_idx  ON sonic_execution_plans(category);
CREATE INDEX IF NOT EXISTS sonic_exec_plans_rec_id_idx    ON sonic_execution_plans(recommendation_id);

CREATE TABLE IF NOT EXISTS sonic_execution_milestones (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id              uuid NOT NULL REFERENCES sonic_execution_plans(id) ON DELETE CASCADE,
  artist_id            uuid NOT NULL REFERENCES artist_profiles(id) ON DELETE CASCADE,
  title                text NOT NULL DEFAULT '',
  description          text NOT NULL DEFAULT '',
  target_day           integer NOT NULL DEFAULT 7,
  completion_criteria  jsonb,
  status               text NOT NULL DEFAULT 'pending',
  completed_at         timestamp with time zone,
  created_at           timestamp with time zone DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS sonic_exec_milestones_plan_id_idx ON sonic_execution_milestones(plan_id);
CREATE INDEX IF NOT EXISTS sonic_exec_milestones_status_idx  ON sonic_execution_milestones(status);

CREATE TABLE IF NOT EXISTS sonic_execution_checkpoints (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id              uuid NOT NULL REFERENCES sonic_execution_plans(id) ON DELETE CASCADE,
  milestone_id         uuid REFERENCES sonic_execution_milestones(id) ON DELETE SET NULL,
  checkpoint_type      text NOT NULL DEFAULT 'manual',
  data_snapshot        jsonb,
  score_at_checkpoint  numeric(4,2) NOT NULL DEFAULT 0,
  notes                text NOT NULL DEFAULT '',
  created_at           timestamp with time zone DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS sonic_exec_checkpoints_plan_id_idx ON sonic_execution_checkpoints(plan_id);

CREATE TABLE IF NOT EXISTS sonic_session_diagnostics (
  id                           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  artist_id                    uuid NOT NULL REFERENCES artist_profiles(id) ON DELETE CASCADE,
  session_id                   uuid REFERENCES creative_sessions(id) ON DELETE SET NULL,
  stagnation_detected          boolean NOT NULL DEFAULT false,
  over_density_detected        boolean NOT NULL DEFAULT false,
  emotional_flatness_detected  boolean NOT NULL DEFAULT false,
  harmonic_repetition_detected boolean NOT NULL DEFAULT false,
  weak_transitions_detected    boolean NOT NULL DEFAULT false,
  diagnostic_score             numeric(4,2) NOT NULL DEFAULT 1.00,
  recommendations              jsonb,
  blueprint_window_size        integer NOT NULL DEFAULT 10,
  analyzed_at                  timestamp with time zone DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS sonic_session_diagnostics_artist_id_idx  ON sonic_session_diagnostics(artist_id);
CREATE INDEX IF NOT EXISTS sonic_session_diagnostics_analyzed_at_idx ON sonic_session_diagnostics(analyzed_at);

CREATE TABLE IF NOT EXISTS sonic_events (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  artist_id    uuid REFERENCES artist_profiles(id) ON DELETE SET NULL,
  event_type   text NOT NULL,
  payload      jsonb,
  processed    boolean NOT NULL DEFAULT false,
  processed_at timestamp with time zone,
  created_at   timestamp with time zone DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS sonic_events_artist_id_idx   ON sonic_events(artist_id);
CREATE INDEX IF NOT EXISTS sonic_events_event_type_idx  ON sonic_events(event_type);
CREATE INDEX IF NOT EXISTS sonic_events_processed_idx   ON sonic_events(processed);
CREATE INDEX IF NOT EXISTS sonic_events_created_at_idx  ON sonic_events(created_at);

CREATE TABLE IF NOT EXISTS sonic_queue_jobs (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  queue_name   text NOT NULL,
  job_id       text,
  job_type     text NOT NULL,
  artist_id    uuid REFERENCES artist_profiles(id) ON DELETE SET NULL,
  payload      jsonb,
  status       text NOT NULL DEFAULT 'pending',
  attempts     integer NOT NULL DEFAULT 0,
  error        text,
  created_at   timestamp with time zone DEFAULT now() NOT NULL,
  completed_at timestamp with time zone
);

CREATE INDEX IF NOT EXISTS sonic_queue_jobs_queue_name_idx ON sonic_queue_jobs(queue_name);
CREATE INDEX IF NOT EXISTS sonic_queue_jobs_status_idx     ON sonic_queue_jobs(status);
CREATE INDEX IF NOT EXISTS sonic_queue_jobs_artist_id_idx  ON sonic_queue_jobs(artist_id);
CREATE INDEX IF NOT EXISTS sonic_queue_jobs_created_at_idx ON sonic_queue_jobs(created_at);

CREATE TABLE IF NOT EXISTS platform_ingestion_signals (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  artist_id   uuid NOT NULL REFERENCES artist_profiles(id) ON DELETE CASCADE,
  platform    text NOT NULL,
  signal_type text NOT NULL,
  track_id    text,
  track_title text,
  value       numeric(12,4) NOT NULL DEFAULT 0,
  recorded_at timestamp with time zone DEFAULT now() NOT NULL,
  ingested_at timestamp with time zone DEFAULT now() NOT NULL,
  metadata    jsonb
);

CREATE INDEX IF NOT EXISTS platform_signals_artist_id_idx   ON platform_ingestion_signals(artist_id);
CREATE INDEX IF NOT EXISTS platform_signals_platform_idx    ON platform_ingestion_signals(platform);
CREATE INDEX IF NOT EXISTS platform_signals_signal_type_idx ON platform_ingestion_signals(signal_type);
CREATE INDEX IF NOT EXISTS platform_signals_recorded_at_idx ON platform_ingestion_signals(recorded_at);

-- Phase 4: Sonic Director Engine

CREATE TABLE sonic_director_recommendations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  artist_id uuid NOT NULL REFERENCES artist_profiles(id) ON DELETE CASCADE,
  recommendation_type text NOT NULL,
  title text NOT NULL DEFAULT '',
  description text NOT NULL DEFAULT '',
  rationale text NOT NULL DEFAULT '',
  confidence_score numeric(4,2) NOT NULL DEFAULT '0.75',
  priority_rank integer NOT NULL DEFAULT 1,
  target_emotion text,
  target_bpm_min integer,
  target_bpm_max integer,
  target_key text,
  target_scale text,
  target_genre text,
  direction_parameters jsonb,
  based_on_count integer NOT NULL DEFAULT 0,
  rl_metadata jsonb,
  generated_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE INDEX sonic_director_recs_artist_id_idx ON sonic_director_recommendations(artist_id);
CREATE INDEX sonic_director_recs_type_idx ON sonic_director_recommendations(recommendation_type);
CREATE INDEX sonic_director_recs_generated_at_idx ON sonic_director_recommendations(generated_at);

CREATE TABLE sonic_missions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  artist_id uuid NOT NULL REFERENCES artist_profiles(id) ON DELETE CASCADE,
  mission_type text NOT NULL,
  title text NOT NULL DEFAULT '',
  description text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'active',
  start_score numeric(5,2) NOT NULL DEFAULT '0',
  current_score numeric(5,2) NOT NULL DEFAULT '0',
  target_score numeric(5,2) NOT NULL DEFAULT '75',
  progress_percentage numeric(5,2) NOT NULL DEFAULT '0',
  blueprint_count_at_start integer NOT NULL DEFAULT 0,
  blueprint_milestones jsonb,
  mission_parameters jsonb,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  completed_at timestamp with time zone
);

CREATE INDEX sonic_missions_artist_id_idx ON sonic_missions(artist_id);
CREATE INDEX sonic_missions_status_idx ON sonic_missions(status);
CREATE INDEX sonic_missions_type_idx ON sonic_missions(mission_type);

CREATE TABLE sonic_gap_analysis (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  artist_id uuid NOT NULL UNIQUE REFERENCES artist_profiles(id) ON DELETE CASCADE,
  underexplored_emotions jsonb,
  overused_bpm_ranges jsonb,
  repetitive_atmospheres jsonb,
  harmonic_stagnation jsonb,
  gap_score numeric(4,2) NOT NULL DEFAULT '0',
  total_blueprints_analyzed integer NOT NULL DEFAULT 0,
  analyzed_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE INDEX sonic_gap_analysis_artist_id_idx ON sonic_gap_analysis(artist_id);

CREATE TABLE sonic_release_simulations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  blueprint_id uuid NOT NULL UNIQUE REFERENCES sonic_world_blueprints(id) ON DELETE CASCADE,
  artist_id uuid NOT NULL REFERENCES artist_profiles(id) ON DELETE CASCADE,
  commercial_score numeric(5,2) NOT NULL DEFAULT '0',
  sync_score numeric(5,2) NOT NULL DEFAULT '0',
  crowd_energy numeric(5,2) NOT NULL DEFAULT '0',
  replayability_prediction numeric(5,2) NOT NULL DEFAULT '0',
  emotional_stickiness numeric(5,2) NOT NULL DEFAULT '0',
  cinematic_potential numeric(5,2) NOT NULL DEFAULT '0',
  overall_release_score numeric(5,2) NOT NULL DEFAULT '0',
  sync_tags jsonb,
  producer_compatibility jsonb,
  simulation_notes text NOT NULL DEFAULT '',
  confidence_score numeric(4,2) NOT NULL DEFAULT '0.80',
  rl_metadata jsonb,
  simulated_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE INDEX sonic_release_sims_blueprint_id_idx ON sonic_release_simulations(blueprint_id);
CREATE INDEX sonic_release_sims_artist_id_idx ON sonic_release_simulations(artist_id);

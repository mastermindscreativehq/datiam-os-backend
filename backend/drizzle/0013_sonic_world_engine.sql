-- 0013_sonic_world_engine.sql
-- Sonic World Engine: 8-dimensional sonic blueprint expansion

CREATE TABLE IF NOT EXISTS sonic_world_blueprints (
  id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id                UUID NOT NULL REFERENCES creative_sessions(id) ON DELETE CASCADE,
  artist_id                 UUID NOT NULL REFERENCES artist_profiles(id) ON DELETE CASCADE,

  -- Genre DNA
  primary_genre             TEXT NOT NULL,
  secondary_genre           TEXT NOT NULL,
  rhythm_influence          TEXT NOT NULL,
  sonic_fusion_identity     TEXT NOT NULL,

  -- Instrumentation Architecture
  drum_style                TEXT NOT NULL,
  percussion_textures       TEXT NOT NULL,
  bass_character            TEXT NOT NULL,
  melodic_instruments       TEXT NOT NULL,
  ambient_layers            TEXT NOT NULL,
  organic_synthetic_ratio   TEXT NOT NULL,

  -- Vocal Architecture
  vocal_texture             TEXT NOT NULL,
  cadence_energy            TEXT NOT NULL,
  harmony_behavior          TEXT NOT NULL,
  emotional_intensity       TEXT NOT NULL,
  vocal_atmosphere          TEXT NOT NULL,

  -- Cinematic Environment
  visual_sonic_atmosphere   TEXT NOT NULL,
  emotional_weather         TEXT NOT NULL,
  scene_energy              TEXT NOT NULL,
  cinematic_references      TEXT NOT NULL,

  -- Rhythm Intelligence
  bpm                       INTEGER NOT NULL,
  groove_behavior           TEXT NOT NULL,
  movement_energy           TEXT NOT NULL,
  percussion_complexity     TEXT NOT NULL,
  swing_characteristics     TEXT NOT NULL,

  -- Harmonic Emotion System
  musical_key               TEXT NOT NULL,
  scale                     TEXT NOT NULL,
  chord_behavior            TEXT NOT NULL,
  emotional_progression     TEXT NOT NULL,
  tension_release_behavior  TEXT NOT NULL,

  -- Hook Strategy
  hook_intensity            TEXT NOT NULL,
  chant_potential           TEXT NOT NULL,
  replayability             TEXT NOT NULL,
  anthem_potential          TEXT NOT NULL,
  crowd_engagement_energy   TEXT NOT NULL,

  -- Production Density (0-100 scores)
  cinematic_density         INTEGER NOT NULL DEFAULT 50,
  spiritual_intensity       INTEGER NOT NULL DEFAULT 50,
  emotional_rawness         INTEGER NOT NULL DEFAULT 50,
  commercial_accessibility  INTEGER NOT NULL DEFAULT 50,
  darkness_vs_hope          INTEGER NOT NULL DEFAULT 50,
  underground_vs_mainstream INTEGER NOT NULL DEFAULT 50,
  organic_vs_synthetic      INTEGER NOT NULL DEFAULT 50,

  -- Assembly
  producer_brief            TEXT NOT NULL,
  coherence_score           NUMERIC(4,2) NOT NULL DEFAULT 0.85,

  engine_version            TEXT NOT NULL DEFAULT 'sw-v1',
  created_at                TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS sw_blueprints_session_id_idx  ON sonic_world_blueprints(session_id);
CREATE INDEX IF NOT EXISTS sw_blueprints_artist_id_idx   ON sonic_world_blueprints(artist_id);
CREATE INDEX IF NOT EXISTS sw_blueprints_created_at_idx  ON sonic_world_blueprints(created_at);

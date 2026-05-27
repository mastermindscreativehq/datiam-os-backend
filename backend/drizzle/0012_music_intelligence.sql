-- 0012_music_intelligence.sql
-- Music Intelligence Engine: creative_sessions, song_blueprints, emotional_profiles, artist_memory

DO $$ BEGIN
  CREATE TYPE emotion_type AS ENUM (
    'grief', 'trauma', 'rage', 'joy', 'melancholy', 'euphoria',
    'anxiety', 'longing', 'triumph', 'nostalgia', 'peace', 'defiance'
  );
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE intention_type AS ENUM (
    'heal_listener', 'inspire_action', 'create_nostalgia', 'deliver_message',
    'uplift_spirit', 'provoke_thought', 'celebrate_truth', 'process_pain'
  );
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE transformation_type AS ENUM (
    'from_pain_to_peace', 'from_stagnation_to_momentum', 'from_confusion_to_clarity',
    'from_isolation_to_belonging', 'from_fear_to_courage', 'from_grief_to_acceptance',
    'from_doubt_to_conviction', 'from_chaos_to_order'
  );
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE session_status AS ENUM ('draft', 'active', 'completed');
EXCEPTION WHEN duplicate_object THEN null; END $$;

CREATE TABLE IF NOT EXISTS creative_sessions (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  artist_id    UUID REFERENCES artist_profiles(id) ON DELETE CASCADE,
  name         TEXT NOT NULL,
  emotion      emotion_type NOT NULL,
  intention    intention_type NOT NULL,
  story        TEXT,
  listener_transformation transformation_type NOT NULL,
  status       session_status NOT NULL DEFAULT 'active',
  created_at   TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS creative_sessions_artist_id_idx ON creative_sessions(artist_id);
CREATE INDEX IF NOT EXISTS creative_sessions_emotion_idx    ON creative_sessions(emotion);
CREATE INDEX IF NOT EXISTS creative_sessions_status_idx     ON creative_sessions(status);

CREATE TABLE IF NOT EXISTS song_blueprints (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id      UUID NOT NULL REFERENCES creative_sessions(id) ON DELETE CASCADE,
  artist_id       UUID REFERENCES artist_profiles(id) ON DELETE CASCADE,
  bpm             INTEGER NOT NULL,
  musical_key     TEXT NOT NULL,
  scale           TEXT NOT NULL,
  atmosphere      TEXT NOT NULL,
  cadence_energy  TEXT NOT NULL,
  chord_direction TEXT NOT NULL,
  vocal_energy    TEXT NOT NULL,
  hook_intensity  TEXT NOT NULL,
  engine_version  TEXT NOT NULL DEFAULT 'v1',
  created_at      TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS song_blueprints_session_id_idx ON song_blueprints(session_id);
CREATE INDEX IF NOT EXISTS song_blueprints_artist_id_idx  ON song_blueprints(artist_id);

CREATE TABLE IF NOT EXISTS emotional_profiles (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  artist_id               UUID REFERENCES artist_profiles(id) ON DELETE CASCADE,
  session_id              UUID REFERENCES creative_sessions(id) ON DELETE CASCADE,
  emotion                 emotion_type NOT NULL,
  intention               intention_type NOT NULL,
  story                   TEXT,
  listener_transformation transformation_type NOT NULL,
  created_at              TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS emotional_profiles_artist_id_idx ON emotional_profiles(artist_id);
CREATE INDEX IF NOT EXISTS emotional_profiles_emotion_idx    ON emotional_profiles(emotion);
CREATE INDEX IF NOT EXISTS emotional_profiles_session_id_idx ON emotional_profiles(session_id);

CREATE TABLE IF NOT EXISTS artist_memory (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  artist_id         UUID NOT NULL UNIQUE REFERENCES artist_profiles(id) ON DELETE CASCADE,
  dominant_emotion  emotion_type,
  recurring_themes  JSONB NOT NULL DEFAULT '[]'::jsonb,
  preferred_keys    JSONB NOT NULL DEFAULT '[]'::jsonb,
  avg_bpm_min       INTEGER,
  avg_bpm_max       INTEGER,
  session_count     INTEGER NOT NULL DEFAULT 0,
  last_session_at   TIMESTAMP,
  created_at        TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS artist_memory_artist_id_idx ON artist_memory(artist_id);

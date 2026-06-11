-- DATIAM Intelligence Phase 1: Audio DNA Engine
-- Migration 0021

CREATE TABLE IF NOT EXISTS "audio_dna" (
  "id"                    uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "upload_id"             uuid NOT NULL REFERENCES "audio_uploads"("id") ON DELETE CASCADE,
  "artist_id"             uuid REFERENCES "artist_profiles"("id") ON DELETE SET NULL,

  -- Genre Intelligence
  "primary_genre"         text NOT NULL DEFAULT 'Unknown',
  "secondary_genre"       text,
  "genre_confidence"      numeric(5,2),
  "genre_tags"            jsonb,

  -- Mood Profile
  "mood_primary"          text,
  "mood_secondary"        text,
  "mood_profile"          jsonb,

  -- Fingerprints (rich JSON objects)
  "emotional_fingerprint" jsonb,
  "sonic_fingerprint"     jsonb,
  "energy_fingerprint"    jsonb,

  -- Sonic Dimensions (0–100 normalised scores)
  "danceability"          numeric(5,2),
  "brightness"            numeric(5,2),
  "warmth"                numeric(5,2),
  "darkness"              numeric(5,2),
  "aggression"            numeric(5,2),
  "spirituality"          numeric(5,2),
  "romance"               numeric(5,2),
  "triumph"               numeric(5,2),
  "melancholy"            numeric(5,2),
  "tension"               numeric(5,2),

  -- Meta
  "analyzer_version"      text NOT NULL DEFAULT '1.0.0',
  "processing_time_ms"    integer,
  "created_at"            timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at"            timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "audio_dna_jobs" (
  "id"            uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "upload_id"     uuid NOT NULL REFERENCES "audio_uploads"("id") ON DELETE CASCADE,
  "queue_job_id"  text,
  "status"        text NOT NULL DEFAULT 'pending',
  "error_message" text,
  "started_at"    timestamp with time zone,
  "completed_at"  timestamp with time zone,
  "created_at"    timestamp with time zone DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "audio_dna_upload_id_idx"      ON "audio_dna" ("upload_id");
CREATE INDEX IF NOT EXISTS "audio_dna_artist_id_idx"      ON "audio_dna" ("artist_id");
CREATE INDEX IF NOT EXISTS "audio_dna_primary_genre_idx"  ON "audio_dna" ("primary_genre");
CREATE INDEX IF NOT EXISTS "audio_dna_jobs_upload_id_idx" ON "audio_dna_jobs" ("upload_id");
CREATE INDEX IF NOT EXISTS "audio_dna_jobs_status_idx"    ON "audio_dna_jobs" ("status");

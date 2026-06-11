-- DATIAM Intelligence Phase 1: Sync Intelligence Engine
-- Migration 0022

CREATE TABLE IF NOT EXISTS "sync_intelligence" (
  "id"                        uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "upload_id"                 uuid NOT NULL REFERENCES "audio_uploads"("id") ON DELETE CASCADE,
  "artist_id"                 uuid REFERENCES "artist_profiles"("id") ON DELETE SET NULL,

  -- Suitability Scores (0–100)
  "film_trailer"              numeric(5,2),
  "netflix_drama"             numeric(5,2),
  "documentary"               numeric(5,2),
  "sports_content"            numeric(5,2),
  "gaming"                    numeric(5,2),
  "fashion"                   numeric(5,2),
  "luxury_brands"             numeric(5,2),
  "travel_campaigns"          numeric(5,2),
  "commercial_ads"            numeric(5,2),
  "social_content"            numeric(5,2),

  -- Per-category Confidence Scores (0–100)
  "film_trailer_confidence"   numeric(5,2),
  "netflix_drama_confidence"  numeric(5,2),
  "documentary_confidence"    numeric(5,2),
  "sports_content_confidence" numeric(5,2),
  "gaming_confidence"         numeric(5,2),
  "fashion_confidence"        numeric(5,2),
  "luxury_brands_confidence"  numeric(5,2),
  "travel_confidence"         numeric(5,2),
  "commercial_confidence"     numeric(5,2),
  "social_confidence"         numeric(5,2),

  -- Ranked Recommendations
  "top_categories"            jsonb,
  "sync_tags"                 jsonb,
  "placement_notes"           text,
  "overall_sync_score"        numeric(5,2),

  -- Meta
  "analyzer_version"          text NOT NULL DEFAULT '1.0.0',
  "processing_time_ms"        integer,
  "created_at"                timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at"                timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "sync_intelligence_jobs" (
  "id"            uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "upload_id"     uuid NOT NULL REFERENCES "audio_uploads"("id") ON DELETE CASCADE,
  "queue_job_id"  text,
  "status"        text NOT NULL DEFAULT 'pending',
  "error_message" text,
  "started_at"    timestamp with time zone,
  "completed_at"  timestamp with time zone,
  "created_at"    timestamp with time zone DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "sync_intel_upload_id_idx"      ON "sync_intelligence" ("upload_id");
CREATE INDEX IF NOT EXISTS "sync_intel_artist_id_idx"      ON "sync_intelligence" ("artist_id");
CREATE INDEX IF NOT EXISTS "sync_intel_overall_score_idx"  ON "sync_intelligence" ("overall_sync_score");
CREATE INDEX IF NOT EXISTS "sync_intel_jobs_upload_idx"    ON "sync_intelligence_jobs" ("upload_id");
CREATE INDEX IF NOT EXISTS "sync_intel_jobs_status_idx"    ON "sync_intelligence_jobs" ("status");

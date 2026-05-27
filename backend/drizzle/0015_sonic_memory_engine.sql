-- Phase 3: Sonic Memory Engine
-- Persistent memory, preference tracking, pattern analysis, and artist profiles

-- ── Sonic Memory ─────────────────────────────────────────────────────────────
CREATE TABLE "sonic_memory" (
  "id"                           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "blueprint_id"                 uuid NOT NULL UNIQUE REFERENCES "sonic_world_blueprints"("id") ON DELETE CASCADE,
  "artist_id"                    uuid NOT NULL REFERENCES "artist_profiles"("id") ON DELETE CASCADE,
  "emotion_at_generation"        text NOT NULL DEFAULT '',
  "intention_at_generation"      text NOT NULL DEFAULT '',
  "bpm"                          integer NOT NULL DEFAULT 90,
  "musical_key"                  text NOT NULL DEFAULT 'C',
  "scale"                        text NOT NULL DEFAULT 'Minor',
  "primary_genre"                text NOT NULL DEFAULT '',
  "secondary_genre"              text NOT NULL DEFAULT '',
  "cinematic_density"            integer NOT NULL DEFAULT 50,
  "spiritual_intensity"          integer NOT NULL DEFAULT 50,
  "emotional_rawness"            integer NOT NULL DEFAULT 50,
  "commercial_accessibility"     integer NOT NULL DEFAULT 50,
  "darkness_vs_hope"             integer NOT NULL DEFAULT 50,
  "underground_vs_mainstream"    integer NOT NULL DEFAULT 50,
  "organic_vs_synthetic"         integer NOT NULL DEFAULT 50,
  "coherence_score"              numeric(4,2) NOT NULL DEFAULT 0.85,
  "confidence_score"             numeric(4,2) NOT NULL DEFAULT 1.00,
  "generation_quality"           text NOT NULL DEFAULT 'excellent',
  "emotional_intensity_score"    numeric(4,2) NOT NULL DEFAULT 0.50,
  "commercial_potential_score"   numeric(4,2) NOT NULL DEFAULT 0.50,
  "spiritual_alignment_score"    numeric(4,2) NOT NULL DEFAULT 0.50,
  "replayability_score"          numeric(4,2) NOT NULL DEFAULT 0.50,
  "memory_vector"                jsonb,
  "rl_weight"                    numeric(4,2) NOT NULL DEFAULT 1.00,
  "ingested_at"                  timestamp with time zone DEFAULT now() NOT NULL
);

CREATE INDEX "sonic_memory_blueprint_id_idx" ON "sonic_memory"("blueprint_id");
CREATE INDEX "sonic_memory_artist_id_idx"    ON "sonic_memory"("artist_id");
CREATE INDEX "sonic_memory_ingested_at_idx"  ON "sonic_memory"("ingested_at");

-- ── Sonic Preferences ─────────────────────────────────────────────────────────
CREATE TABLE "sonic_preferences" (
  "id"              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "blueprint_id"    uuid NOT NULL REFERENCES "sonic_world_blueprints"("id") ON DELETE CASCADE,
  "artist_id"       uuid NOT NULL REFERENCES "artist_profiles"("id") ON DELETE CASCADE,
  "preference_type" text NOT NULL,
  "metadata"        jsonb,
  "created_at"      timestamp with time zone DEFAULT now() NOT NULL
);

CREATE INDEX "sonic_preferences_blueprint_id_idx" ON "sonic_preferences"("blueprint_id");
CREATE INDEX "sonic_preferences_artist_id_idx"    ON "sonic_preferences"("artist_id");
CREATE INDEX "sonic_preferences_type_idx"         ON "sonic_preferences"("preference_type");

-- ── Sonic Patterns ────────────────────────────────────────────────────────────
CREATE TABLE "sonic_patterns" (
  "id"                           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "artist_id"                    uuid NOT NULL UNIQUE REFERENCES "artist_profiles"("id") ON DELETE CASCADE,
  "bpm_distribution"             jsonb,
  "key_distribution"             jsonb,
  "scale_distribution"           jsonb,
  "emotion_tendencies"           jsonb,
  "commercial_tendencies"        jsonb,
  "atmospheric_patterns"         jsonb,
  "vocal_architecture_trends"    jsonb,
  "dominant_emotion"             text,
  "dominant_key"                 text,
  "dominant_scale"               text,
  "dominant_genre"               text,
  "avg_bpm"                      numeric(6,2),
  "avg_coherence"                numeric(4,2),
  "avg_commercial_accessibility" numeric(4,2),
  "avg_spiritual_intensity"      numeric(4,2),
  "avg_emotional_rawness"        numeric(4,2),
  "total_blueprints_analyzed"    integer NOT NULL DEFAULT 0,
  "last_analyzed_at"             timestamp with time zone DEFAULT now() NOT NULL
);

CREATE INDEX "sonic_patterns_artist_id_idx" ON "sonic_patterns"("artist_id");

-- ── Sonic Artist Profiles ─────────────────────────────────────────────────────
CREATE TABLE "sonic_artist_profiles" (
  "id"                              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "artist_id"                       uuid NOT NULL UNIQUE REFERENCES "artist_profiles"("id") ON DELETE CASCADE,
  "profile_summary"                 text NOT NULL DEFAULT '',
  "sonic_identity_tags"             jsonb,
  "dominant_genres"                 jsonb,
  "evolution_stage"                 text NOT NULL DEFAULT 'emerging',
  "strongest_coherence_id"          uuid REFERENCES "sonic_world_blueprints"("id") ON DELETE SET NULL,
  "highest_emotional_intensity_id"  uuid REFERENCES "sonic_world_blueprints"("id") ON DELETE SET NULL,
  "highest_commercial_id"           uuid REFERENCES "sonic_world_blueprints"("id") ON DELETE SET NULL,
  "most_spiritual_id"               uuid REFERENCES "sonic_world_blueprints"("id") ON DELETE SET NULL,
  "most_replayable_id"              uuid REFERENCES "sonic_world_blueprints"("id") ON DELETE SET NULL,
  "computed_at"                     timestamp with time zone DEFAULT now() NOT NULL
);

CREATE INDEX "sonic_artist_profiles_artist_id_idx" ON "sonic_artist_profiles"("artist_id");

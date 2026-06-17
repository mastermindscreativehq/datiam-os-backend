-- =============================================================================
-- DATIAM OS Phase 1.5 — Grounding Foundation
-- Migration 0024: Sync Licensing Intelligence Schema
-- =============================================================================
-- Tables:
--   companies               — registry of companies that license music
--   licensing_contacts      — individual contacts at those companies
--   sync_rate_benchmarks    — market fee reference data per license type/territory
--   placement_opportunities — a specific sync licensing opportunity for a song
--   placement_outcomes      — the result of an opportunity (placed, rejected, etc.)
--   prediction_accuracy_log — AI prediction vs actual outcome (immutable audit trail)
--
-- Design principles:
--   • Production-grade PostgreSQL — uuid PKs, tz-aware timestamps, FK integrity
--   • Soft-delete via deleted_at (NULL = active) on mutable tables
--   • Multi-artist: all placement-scoped tables carry artist_id
--   • SaaS-ready: org_id (nullable) on tenant-capable tables for future isolation
--   • Fully idempotent — IF NOT EXISTS / EXCEPTION WHEN duplicate_object guards
-- =============================================================================


-- ─────────────────────────────────────────────────────────────────────────────
-- ENUMS
-- ─────────────────────────────────────────────────────────────────────────────

DO $$ BEGIN
  CREATE TYPE company_type AS ENUM (
    'production_house',
    'ad_agency',
    'music_supervisor_firm',
    'brand',
    'streaming_platform',
    'game_studio',
    'trailer_house',
    'music_library',
    'tv_network',
    'film_studio',
    'other'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint

DO $$ BEGIN
  CREATE TYPE company_tier AS ENUM ('tier_a', 'tier_b', 'tier_c', 'unrated');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint

DO $$ BEGIN
  CREATE TYPE contact_relationship_status AS ENUM (
    'prospect',
    'active',
    'dormant',
    'unresponsive',
    'blacklisted'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint

DO $$ BEGIN
  CREATE TYPE sync_license_type AS ENUM (
    'film_trailer',
    'netflix_drama',
    'documentary',
    'sports_content',
    'gaming',
    'fashion',
    'luxury_brand',
    'travel_campaign',
    'commercial_ad',
    'social_content',
    'tv_drama',
    'tv_comedy',
    'reality_tv',
    'podcast',
    'youtube',
    'music_library'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint

DO $$ BEGIN
  CREATE TYPE placement_status AS ENUM (
    'identified',
    'pitched',
    'negotiating',
    'contracted',
    'rejected',
    'withdrawn',
    'expired'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint

DO $$ BEGIN
  CREATE TYPE placement_source AS ENUM (
    'inbound',
    'outbound_pitch',
    'agent',
    'platform',
    'network_referral'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint

DO $$ BEGIN
  CREATE TYPE placement_outcome_type AS ENUM (
    'placed',
    'rejected',
    'expired',
    'negotiation_failed',
    'withdrawn_by_artist'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint

DO $$ BEGIN
  CREATE TYPE prediction_type AS ENUM (
    'sync_suitability',
    'placement_likelihood',
    'fee_estimate',
    'rejection_risk',
    'time_to_placement'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint


-- ─────────────────────────────────────────────────────────────────────────────
-- 1. companies
-- ─────────────────────────────────────────────────────────────────────────────
-- Global registry of companies that license music.
-- org_id = NULL means the record is globally shared across all tenants.
-- org_id = <uuid> scopes the record to a specific SaaS tenant (future use).

CREATE TABLE IF NOT EXISTS "companies" (
  "id"                    uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "org_id"                uuid,
  "name"                  text NOT NULL,
  "type"                  company_type NOT NULL DEFAULT 'other',
  "tier"                  company_tier NOT NULL DEFAULT 'unrated',
  "website"               text,
  "country"               text,
  "city"                  text,
  "genre_focus"           jsonb,
  "deal_volume_per_year"  integer,
  "avg_license_fee_usd"   numeric(12,2),
  "notes"                 text,
  "deleted_at"            timestamp with time zone,
  "created_at"            timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at"            timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "companies_name_idx"         ON "companies" ("name");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "companies_type_idx"         ON "companies" ("type");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "companies_tier_idx"         ON "companies" ("tier");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "companies_org_id_idx"       ON "companies" ("org_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "companies_deleted_at_idx"   ON "companies" ("deleted_at");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "companies_country_type_idx" ON "companies" ("country", "type");
--> statement-breakpoint


-- ─────────────────────────────────────────────────────────────────────────────
-- 2. licensing_contacts
-- ─────────────────────────────────────────────────────────────────────────────
-- Individual contacts at companies who handle sync licensing decisions.
-- artist_id scopes contacts to the managing artist's context.

CREATE TABLE IF NOT EXISTS "licensing_contacts" (
  "id"                    uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "artist_id"             uuid REFERENCES "artist_profiles"("id") ON DELETE SET NULL,
  "company_id"            uuid REFERENCES "companies"("id") ON DELETE SET NULL,
  "full_name"             text NOT NULL,
  "email"                 text,
  "phone"                 text,
  "role"                  text,
  "linkedin_url"          text,
  "imdb_url"              text,
  "relationship_status"   contact_relationship_status NOT NULL DEFAULT 'prospect',
  "relationship_score"    smallint CHECK ("relationship_score" BETWEEN 1 AND 10),
  "last_contacted_at"     timestamp with time zone,
  "next_follow_up_at"     timestamp with time zone,
  "genre_preferences"     jsonb,
  "placement_history"     jsonb,
  "notes"                 text,
  "deleted_at"            timestamp with time zone,
  "created_at"            timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at"            timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "lc_artist_id_idx"           ON "licensing_contacts" ("artist_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "lc_company_id_idx"          ON "licensing_contacts" ("company_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "lc_email_idx"               ON "licensing_contacts" ("email");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "lc_relationship_status_idx" ON "licensing_contacts" ("relationship_status");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "lc_next_follow_up_idx"      ON "licensing_contacts" ("next_follow_up_at");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "lc_deleted_at_idx"          ON "licensing_contacts" ("deleted_at");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "lc_artist_company_idx"      ON "licensing_contacts" ("artist_id", "company_id");
--> statement-breakpoint


-- ─────────────────────────────────────────────────────────────────────────────
-- 3. sync_rate_benchmarks
-- ─────────────────────────────────────────────────────────────────────────────
-- Market rate reference data per license type / territory / artist tier.
-- Powers fee estimation and AI confidence calibration.
-- No soft-delete — supersede by setting effective_to, never delete.

CREATE TABLE IF NOT EXISTS "sync_rate_benchmarks" (
  "id"                    uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "org_id"                uuid,
  "license_type"          sync_license_type NOT NULL,
  "territory"             text NOT NULL DEFAULT 'worldwide',
  "artist_tier"           text NOT NULL DEFAULT 'emerging',
  "genre"                 text,
  "track_duration_min"    integer,
  "track_duration_max"    integer,
  "min_fee_usd"           numeric(12,2) NOT NULL,
  "max_fee_usd"           numeric(12,2) NOT NULL,
  "avg_fee_usd"           numeric(12,2) NOT NULL,
  "currency"              text NOT NULL DEFAULT 'USD',
  "source"                text NOT NULL DEFAULT 'industry_report',
  "source_url"            text,
  "effective_from"        date NOT NULL,
  "effective_to"          date,
  "sample_size"           integer,
  "notes"                 text,
  "created_at"            timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at"            timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "srb_fee_range_check" CHECK ("max_fee_usd" >= "min_fee_usd")
);
--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "srb_license_type_idx"           ON "sync_rate_benchmarks" ("license_type");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "srb_territory_idx"              ON "sync_rate_benchmarks" ("territory");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "srb_artist_tier_idx"            ON "sync_rate_benchmarks" ("artist_tier");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "srb_genre_idx"                  ON "sync_rate_benchmarks" ("genre");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "srb_effective_from_idx"         ON "sync_rate_benchmarks" ("effective_from");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "srb_org_id_idx"                 ON "sync_rate_benchmarks" ("org_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "srb_type_territory_tier_idx"    ON "sync_rate_benchmarks" ("license_type", "territory", "artist_tier");
--> statement-breakpoint


-- ─────────────────────────────────────────────────────────────────────────────
-- 4. placement_opportunities
-- ─────────────────────────────────────────────────────────────────────────────
-- A specific sync licensing opportunity targeting an artist's song.
-- Bridges company/contact CRM data with AI sync analysis.

CREATE TABLE IF NOT EXISTS "placement_opportunities" (
  "id"                    uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "artist_id"             uuid NOT NULL REFERENCES "artist_profiles"("id") ON DELETE CASCADE,
  "song_id"               uuid REFERENCES "songs"("id") ON DELETE SET NULL,
  "upload_id"             uuid REFERENCES "audio_uploads"("id") ON DELETE SET NULL,
  "company_id"            uuid REFERENCES "companies"("id") ON DELETE SET NULL,
  "contact_id"            uuid REFERENCES "licensing_contacts"("id") ON DELETE SET NULL,

  "title"                 text NOT NULL,
  "license_type"          sync_license_type NOT NULL,
  "status"                placement_status NOT NULL DEFAULT 'identified',
  "source"                placement_source NOT NULL DEFAULT 'outbound_pitch',
  "territory"             text NOT NULL DEFAULT 'worldwide',
  "term_years"            smallint,
  "exclusivity"           boolean NOT NULL DEFAULT false,

  "budget_min_usd"        numeric(12,2),
  "budget_max_usd"        numeric(12,2),
  "currency"              text NOT NULL DEFAULT 'USD',

  "ai_sync_score"         numeric(5,2),
  "ai_confidence"         numeric(5,2),
  "ai_top_categories"     jsonb,

  "pitched_at"            timestamp with time zone,
  "response_due_at"       timestamp with time zone,
  "contracted_at"         timestamp with time zone,
  "deadline_at"           timestamp with time zone,

  "notes"                 text,
  "metadata"              jsonb,

  "deleted_at"            timestamp with time zone,
  "created_at"            timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at"            timestamp with time zone DEFAULT now() NOT NULL,

  CONSTRAINT "po_budget_range_check" CHECK (
    "budget_max_usd" IS NULL OR "budget_min_usd" IS NULL OR "budget_max_usd" >= "budget_min_usd"
  )
);
--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "po_artist_id_idx"       ON "placement_opportunities" ("artist_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "po_song_id_idx"         ON "placement_opportunities" ("song_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "po_upload_id_idx"       ON "placement_opportunities" ("upload_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "po_company_id_idx"      ON "placement_opportunities" ("company_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "po_contact_id_idx"      ON "placement_opportunities" ("contact_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "po_status_idx"          ON "placement_opportunities" ("status");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "po_license_type_idx"    ON "placement_opportunities" ("license_type");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "po_deleted_at_idx"      ON "placement_opportunities" ("deleted_at");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "po_response_due_idx"    ON "placement_opportunities" ("response_due_at");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "po_ai_score_idx"        ON "placement_opportunities" ("ai_sync_score");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "po_artist_status_idx"   ON "placement_opportunities" ("artist_id", "status");
--> statement-breakpoint


-- ─────────────────────────────────────────────────────────────────────────────
-- 5. placement_outcomes
-- ─────────────────────────────────────────────────────────────────────────────
-- The resolved result of a placement_opportunity.
-- One opportunity yields exactly one outcome (enforced by UNIQUE constraint).
-- Stores contracted terms and the AI score at pitch time for post-mortem analysis.

CREATE TABLE IF NOT EXISTS "placement_outcomes" (
  "id"                      uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "opportunity_id"          uuid NOT NULL UNIQUE REFERENCES "placement_opportunities"("id") ON DELETE CASCADE,
  "artist_id"               uuid NOT NULL REFERENCES "artist_profiles"("id") ON DELETE CASCADE,
  "song_id"                 uuid REFERENCES "songs"("id") ON DELETE SET NULL,

  "outcome"                 placement_outcome_type NOT NULL,
  "rejection_reason"        text,

  "final_fee_usd"           numeric(12,2),
  "currency"                text NOT NULL DEFAULT 'USD',
  "royalties_collected_usd" numeric(12,2),

  "license_type"            sync_license_type,
  "territory"               text,
  "term_start"              date,
  "term_end"                date,
  "exclusivity"             boolean DEFAULT false,

  "contract_url"            text,
  "contract_reference"      text,

  "ai_score_at_pitch"       numeric(5,2),
  "outcome_quality_score"   numeric(5,2),

  "notes"                   text,
  "metadata"                jsonb,

  "created_at"              timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at"              timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "pout_opportunity_id_idx"  ON "placement_outcomes" ("opportunity_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "pout_artist_id_idx"       ON "placement_outcomes" ("artist_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "pout_song_id_idx"         ON "placement_outcomes" ("song_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "pout_outcome_idx"         ON "placement_outcomes" ("outcome");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "pout_artist_outcome_idx"  ON "placement_outcomes" ("artist_id", "outcome");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "pout_term_start_idx"      ON "placement_outcomes" ("term_start");
--> statement-breakpoint


-- ─────────────────────────────────────────────────────────────────────────────
-- 6. prediction_accuracy_log
-- ─────────────────────────────────────────────────────────────────────────────
-- Immutable audit trail: AI prediction vs actual outcome for model calibration.
-- No soft-delete. Records are append-only; resolved=true once actual_value is known.

CREATE TABLE IF NOT EXISTS "prediction_accuracy_log" (
  "id"                    uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,

  "model_version"         text NOT NULL,
  "prediction_type"       prediction_type NOT NULL,
  "analyzer_version"      text,

  "upload_id"             uuid REFERENCES "audio_uploads"("id") ON DELETE SET NULL,
  "song_id"               uuid REFERENCES "songs"("id") ON DELETE SET NULL,
  "opportunity_id"        uuid REFERENCES "placement_opportunities"("id") ON DELETE SET NULL,
  "outcome_id"            uuid REFERENCES "placement_outcomes"("id") ON DELETE SET NULL,

  "predicted_value"       numeric(10,4) NOT NULL,
  "predicted_label"       text,
  "actual_value"          numeric(10,4),
  "actual_label"          text,
  "error_margin"          numeric(10,4),
  "accuracy_score"        numeric(5,2),

  "feature_vector"        jsonb,
  "raw_model_output"      jsonb,

  "resolved"              boolean NOT NULL DEFAULT false,
  "resolved_at"           timestamp with time zone,

  "notes"                 text,
  "created_at"            timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "pal_model_version_idx"       ON "prediction_accuracy_log" ("model_version");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "pal_prediction_type_idx"     ON "prediction_accuracy_log" ("prediction_type");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "pal_upload_id_idx"           ON "prediction_accuracy_log" ("upload_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "pal_song_id_idx"             ON "prediction_accuracy_log" ("song_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "pal_opportunity_id_idx"      ON "prediction_accuracy_log" ("opportunity_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "pal_outcome_id_idx"          ON "prediction_accuracy_log" ("outcome_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "pal_resolved_idx"            ON "prediction_accuracy_log" ("resolved");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "pal_created_at_idx"          ON "prediction_accuracy_log" ("created_at");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "pal_model_type_resolved_idx" ON "prediction_accuracy_log" ("model_version", "prediction_type", "resolved");

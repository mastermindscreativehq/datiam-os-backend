-- DATIAM OS — Distribution Engine
-- Migration 0052
--
-- Purpose: Create the Distribution module per the frozen architecture
-- (plans/datiam-os-architecture-freeze.md). Additive only — does NOT touch
-- `releases.isrc/upc/primary_isrc` or `catalog_identifiers`; that
-- consolidation is a separate, later phase requiring a verified backfill.
--   - 5 new enums: distribution_dsp, distribution_delivery_status,
--     distribution_territory_status, distribution_takedown_status,
--     distribution_health_status.
--   - distribution_identifiers: go-forward canonical ISRC/UPC/ISWC store.
--   - distribution_deliveries: per-release, per-DSP delivery records.
--   - distribution_territories: per-delivery territory availability.
--   - distribution_takedowns: takedown request/lifecycle tracking.
--   - distribution_health: one rollup row per release.
--   - delivery_logs: append-only per-delivery event log.
--
-- Rollback:
--   DROP TABLE IF EXISTS delivery_logs;
--   DROP TABLE IF EXISTS distribution_territories;
--   DROP TABLE IF EXISTS distribution_takedowns;
--   DROP TABLE IF EXISTS distribution_health;
--   DROP TABLE IF EXISTS distribution_deliveries;
--   DROP TABLE IF EXISTS distribution_identifiers;
--   DROP TYPE IF EXISTS distribution_health_status;
--   DROP TYPE IF EXISTS distribution_takedown_status;
--   DROP TYPE IF EXISTS distribution_territory_status;
--   DROP TYPE IF EXISTS distribution_delivery_status;
--   DROP TYPE IF EXISTS distribution_dsp;

-- ── 1. Enums ───────────────────────────────────────────────────────────────
DO $$ BEGIN
 CREATE TYPE "public"."distribution_dsp" AS ENUM('spotify', 'apple_music', 'youtube_music', 'amazon_music', 'tidal', 'deezer', 'other');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."distribution_delivery_status" AS ENUM('pending', 'delivered', 'failed', 'taken_down', 'redelivering');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."distribution_territory_status" AS ENUM('available', 'unavailable', 'pending');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."distribution_takedown_status" AS ENUM('requested', 'in_progress', 'completed', 'failed');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."distribution_health_status" AS ENUM('healthy', 'degraded', 'failing');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint

-- ── 2. Tables ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "distribution_identifiers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"song_id" uuid,
	"release_id" uuid,
	"identifier_type" "catalog_identifier_type" NOT NULL,
	"value" text NOT NULL,
	"assigned_by" text,
	"assigned_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "distribution_deliveries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"release_id" uuid NOT NULL,
	"song_id" uuid,
	"dsp" "distribution_dsp" NOT NULL,
	"status" "distribution_delivery_status" DEFAULT 'pending' NOT NULL,
	"format" text,
	"external_id" text,
	"delivered_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "distribution_territories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"delivery_id" uuid NOT NULL,
	"territory_code" text NOT NULL,
	"status" "distribution_territory_status" DEFAULT 'pending' NOT NULL,
	"effective_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "distribution_takedowns" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"delivery_id" uuid NOT NULL,
	"reason" text,
	"status" "distribution_takedown_status" DEFAULT 'requested' NOT NULL,
	"requested_by" uuid,
	"requested_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "distribution_health" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"release_id" uuid NOT NULL,
	"overall_status" "distribution_health_status" DEFAULT 'healthy' NOT NULL,
	"details" jsonb DEFAULT '{}' NOT NULL,
	"last_checked_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "delivery_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"delivery_id" uuid NOT NULL,
	"event_type" text NOT NULL,
	"message" text,
	"payload" jsonb DEFAULT '{}' NOT NULL,
	"occurred_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint

-- ── 3. Foreign keys ────────────────────────────────────────────────────────
ALTER TABLE "distribution_identifiers" ADD CONSTRAINT "distribution_identifiers_song_id_songs_id_fk" FOREIGN KEY ("song_id") REFERENCES "public"."songs"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "distribution_identifiers" ADD CONSTRAINT "distribution_identifiers_release_id_releases_id_fk" FOREIGN KEY ("release_id") REFERENCES "public"."releases"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "distribution_deliveries" ADD CONSTRAINT "distribution_deliveries_release_id_releases_id_fk" FOREIGN KEY ("release_id") REFERENCES "public"."releases"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "distribution_deliveries" ADD CONSTRAINT "distribution_deliveries_song_id_songs_id_fk" FOREIGN KEY ("song_id") REFERENCES "public"."songs"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "distribution_territories" ADD CONSTRAINT "distribution_territories_delivery_id_distribution_deliveries_id_fk" FOREIGN KEY ("delivery_id") REFERENCES "public"."distribution_deliveries"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "distribution_takedowns" ADD CONSTRAINT "distribution_takedowns_delivery_id_distribution_deliveries_id_fk" FOREIGN KEY ("delivery_id") REFERENCES "public"."distribution_deliveries"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "distribution_takedowns" ADD CONSTRAINT "distribution_takedowns_requested_by_users_id_fk" FOREIGN KEY ("requested_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "distribution_health" ADD CONSTRAINT "distribution_health_release_id_releases_id_fk" FOREIGN KEY ("release_id") REFERENCES "public"."releases"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "delivery_logs" ADD CONSTRAINT "delivery_logs_delivery_id_distribution_deliveries_id_fk" FOREIGN KEY ("delivery_id") REFERENCES "public"."distribution_deliveries"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint

-- ── 4. Indexes ─────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS "distribution_identifiers_song_id_idx" ON "distribution_identifiers" USING btree ("song_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "distribution_identifiers_release_id_idx" ON "distribution_identifiers" USING btree ("release_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "distribution_identifiers_type_idx" ON "distribution_identifiers" USING btree ("identifier_type");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "distribution_identifiers_value_idx" ON "distribution_identifiers" USING btree ("value");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "distribution_deliveries_release_id_idx" ON "distribution_deliveries" USING btree ("release_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "distribution_deliveries_dsp_idx" ON "distribution_deliveries" USING btree ("dsp");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "distribution_deliveries_status_idx" ON "distribution_deliveries" USING btree ("status");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "distribution_territories_delivery_id_idx" ON "distribution_territories" USING btree ("delivery_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "distribution_territories_code_idx" ON "distribution_territories" USING btree ("territory_code");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "distribution_takedowns_delivery_id_idx" ON "distribution_takedowns" USING btree ("delivery_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "distribution_takedowns_status_idx" ON "distribution_takedowns" USING btree ("status");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "distribution_health_release_id_idx" ON "distribution_health" USING btree ("release_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "distribution_health_status_idx" ON "distribution_health" USING btree ("overall_status");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "delivery_logs_delivery_id_idx" ON "delivery_logs" USING btree ("delivery_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "delivery_logs_event_type_idx" ON "delivery_logs" USING btree ("event_type");

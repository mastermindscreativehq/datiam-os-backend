-- DATIAM OS — Playlists Engine
-- Migration 0053
--
-- Purpose: Create the Playlists module per the frozen architecture
-- (plans/datiam-os-architecture-freeze.md). Additive only.
--   - 4 new enums: playlist_type, playlist_dsp, playlist_pitch_status,
--     playlist_placement_source.
--   - playlists: editorial/user/dsp/curator playlist catalog.
--   - playlist_pitches: pitch lifecycle for a song -> playlist.
--   - playlist_placements: confirmed song-on-playlist appearances.
--   - playlist_campaigns: junction to campaign-manager's campaigns.
--   - playlist_analytics: per-placement performance snapshots.
--   - playlist_outreach_history: append-only outreach touch log.
--
-- Rollback:
--   DROP TABLE IF EXISTS playlist_outreach_history;
--   DROP TABLE IF EXISTS playlist_analytics;
--   DROP TABLE IF EXISTS playlist_campaigns;
--   DROP TABLE IF EXISTS playlist_placements;
--   DROP TABLE IF EXISTS playlist_pitches;
--   DROP TABLE IF EXISTS playlists;
--   DROP TYPE IF EXISTS playlist_placement_source;
--   DROP TYPE IF EXISTS playlist_pitch_status;
--   DROP TYPE IF EXISTS playlist_dsp;
--   DROP TYPE IF EXISTS playlist_type;

-- ── 1. Enums ───────────────────────────────────────────────────────────────
DO $$ BEGIN
 CREATE TYPE "public"."playlist_type" AS ENUM('editorial', 'user', 'dsp', 'curator');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."playlist_dsp" AS ENUM('spotify', 'apple_music', 'youtube_music', 'amazon_music', 'tidal', 'deezer', 'other');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."playlist_pitch_status" AS ENUM('draft', 'submitted', 'under_review', 'accepted', 'rejected', 'added', 'removed');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."playlist_placement_source" AS ENUM('pitch', 'algorithmic', 'organic', 'paid', 'unknown');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint

-- ── 2. Tables ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "playlists" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"type" "playlist_type" NOT NULL,
	"dsp" "playlist_dsp",
	"curator_contact_id" uuid,
	"owner_user_id" uuid,
	"external_url" text,
	"genre_tags" jsonb DEFAULT '[]' NOT NULL,
	"follower_count" integer,
	"notes" text,
	"metadata" jsonb DEFAULT '{}' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "playlist_pitches" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"playlist_id" uuid NOT NULL,
	"song_id" uuid NOT NULL,
	"release_id" uuid,
	"outreach_message_id" uuid,
	"status" "playlist_pitch_status" DEFAULT 'draft' NOT NULL,
	"pitch_note" text,
	"decision_note" text,
	"submitted_at" timestamp,
	"decided_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "playlist_placements" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"playlist_id" uuid NOT NULL,
	"song_id" uuid NOT NULL,
	"pitch_id" uuid,
	"source" "playlist_placement_source" DEFAULT 'unknown' NOT NULL,
	"position" integer,
	"added_at" timestamp NOT NULL,
	"removed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "playlist_campaigns" (
	"campaign_id" uuid NOT NULL,
	"playlist_id" uuid NOT NULL,
	"goal_adds" integer,
	"added_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "playlist_campaigns_campaign_id_playlist_id_pk" PRIMARY KEY("campaign_id","playlist_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "playlist_analytics" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"placement_id" uuid NOT NULL,
	"snapshot_date" date NOT NULL,
	"streams" bigint,
	"saves" bigint,
	"skip_rate" numeric(5, 2),
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "playlist_outreach_history" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"playlist_id" uuid NOT NULL,
	"outreach_message_id" uuid,
	"event_type" text NOT NULL,
	"note" text,
	"occurred_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint

-- ── 3. Foreign keys ────────────────────────────────────────────────────────
ALTER TABLE "playlists" ADD CONSTRAINT "playlists_curator_contact_id_licensing_contacts_id_fk" FOREIGN KEY ("curator_contact_id") REFERENCES "public"."licensing_contacts"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "playlists" ADD CONSTRAINT "playlists_owner_user_id_users_id_fk" FOREIGN KEY ("owner_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "playlist_pitches" ADD CONSTRAINT "playlist_pitches_playlist_id_playlists_id_fk" FOREIGN KEY ("playlist_id") REFERENCES "public"."playlists"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "playlist_pitches" ADD CONSTRAINT "playlist_pitches_song_id_songs_id_fk" FOREIGN KEY ("song_id") REFERENCES "public"."songs"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "playlist_pitches" ADD CONSTRAINT "playlist_pitches_release_id_releases_id_fk" FOREIGN KEY ("release_id") REFERENCES "public"."releases"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "playlist_pitches" ADD CONSTRAINT "playlist_pitches_outreach_message_id_outreach_message_id_fk" FOREIGN KEY ("outreach_message_id") REFERENCES "public"."outreach_message"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "playlist_placements" ADD CONSTRAINT "playlist_placements_playlist_id_playlists_id_fk" FOREIGN KEY ("playlist_id") REFERENCES "public"."playlists"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "playlist_placements" ADD CONSTRAINT "playlist_placements_song_id_songs_id_fk" FOREIGN KEY ("song_id") REFERENCES "public"."songs"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "playlist_placements" ADD CONSTRAINT "playlist_placements_pitch_id_playlist_pitches_id_fk" FOREIGN KEY ("pitch_id") REFERENCES "public"."playlist_pitches"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "playlist_campaigns" ADD CONSTRAINT "playlist_campaigns_campaign_id_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaigns"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "playlist_campaigns" ADD CONSTRAINT "playlist_campaigns_playlist_id_playlists_id_fk" FOREIGN KEY ("playlist_id") REFERENCES "public"."playlists"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "playlist_analytics" ADD CONSTRAINT "playlist_analytics_placement_id_playlist_placements_id_fk" FOREIGN KEY ("placement_id") REFERENCES "public"."playlist_placements"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "playlist_outreach_history" ADD CONSTRAINT "playlist_outreach_history_playlist_id_playlists_id_fk" FOREIGN KEY ("playlist_id") REFERENCES "public"."playlists"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "playlist_outreach_history" ADD CONSTRAINT "playlist_outreach_history_outreach_message_id_outreach_message_id_fk" FOREIGN KEY ("outreach_message_id") REFERENCES "public"."outreach_message"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint

-- ── 4. Indexes ─────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS "playlists_type_idx" ON "playlists" USING btree ("type");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "playlists_dsp_idx" ON "playlists" USING btree ("dsp");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "playlists_curator_contact_id_idx" ON "playlists" USING btree ("curator_contact_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "playlist_pitches_playlist_id_idx" ON "playlist_pitches" USING btree ("playlist_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "playlist_pitches_song_id_idx" ON "playlist_pitches" USING btree ("song_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "playlist_pitches_status_idx" ON "playlist_pitches" USING btree ("status");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "playlist_placements_playlist_id_idx" ON "playlist_placements" USING btree ("playlist_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "playlist_placements_song_id_idx" ON "playlist_placements" USING btree ("song_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "playlist_placements_added_at_idx" ON "playlist_placements" USING btree ("added_at");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "playlist_campaigns_playlist_id_idx" ON "playlist_campaigns" USING btree ("playlist_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "playlist_analytics_placement_id_idx" ON "playlist_analytics" USING btree ("placement_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "playlist_analytics_snapshot_date_idx" ON "playlist_analytics" USING btree ("snapshot_date");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "playlist_outreach_history_playlist_id_idx" ON "playlist_outreach_history" USING btree ("playlist_id");

DO $$ BEGIN
 CREATE TYPE "public"."asset_type" AS ENUM('wav', 'mp3', 'stem', 'instrumental', 'clean', 'acapella', 'cover_art', 'visualizer', 'lyrics_doc');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."automation_source" AS ENUM('backend', 'n8n', 'cron', 'manual');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."automation_status" AS ENUM('success', 'failed', 'running');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."contact_type" AS ENUM('playlist_curator', 'blogger', 'dj', 'influencer', 'music_supervisor', 'radio', 'podcast', 'press');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."content_status" AS ENUM('idea', 'scripted', 'recorded', 'edited', 'scheduled', 'posted');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."content_type" AS ENUM('short_video', 'interview', 'post', 'thread', 'live_script', 'reel', 'tiktok', 'youtube_short');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."contributor_role" AS ENUM('writer', 'producer', 'composer', 'mixer', 'mastering_engineer', 'featured_artist');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."fan_event_type" AS ENUM('joined_telegram', 'clicked_link', 'commented', 'shared', 'pre_saved', 'streamed', 'replied', 'purchased');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."release_publish_status" AS ENUM('planning', 'submitted', 'approved', 'live');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."release_type" AS ENUM('single', 'ep', 'album');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."royalty_type" AS ENUM('master', 'publishing', 'mechanical', 'performance', 'neighboring', 'sync');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."song_release_status" AS ENUM('draft', 'registered', 'distributed', 'released', 'archived');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."sync_opportunity_type" AS ENUM('film', 'tv', 'ad', 'game', 'trailer', 'youtube', 'library');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."sync_status" AS ENUM('prospect', 'pitched', 'follow_up', 'accepted', 'rejected');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."task_category" AS ENUM('registration', 'distribution', 'content', 'marketing', 'sync', 'royalty');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."task_status" AS ENUM('todo', 'doing', 'done', 'blocked');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."user_role" AS ENUM('owner', 'admin', 'team');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "artist_profiles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"stage_name" text NOT NULL,
	"legal_name" text,
	"bio" text,
	"country" text,
	"genre_primary" text,
	"genre_secondary" text,
	"brand_statement" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "automation_runs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workflow_name" text NOT NULL,
	"source" "automation_source" NOT NULL,
	"status" "automation_status" NOT NULL,
	"payload" jsonb,
	"result" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "content_ideas" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"song_id" uuid,
	"content_type" "content_type" NOT NULL,
	"hook" text,
	"script" text,
	"caption" text,
	"platform" text,
	"status" "content_status" DEFAULT 'idea' NOT NULL,
	"scheduled_date" date,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "contributors" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"song_id" uuid NOT NULL,
	"name" text NOT NULL,
	"role" "contributor_role" NOT NULL,
	"ownership_percentage" numeric(5, 2),
	"publishing_percentage" numeric(5, 2),
	"master_percentage" numeric(5, 2),
	"pro_affiliation" text,
	"ipi_number" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "crm_contacts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"company" text,
	"role" text,
	"email" text,
	"phone" text,
	"platform" text,
	"contact_type" "contact_type" NOT NULL,
	"relationship_status" text,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "fan_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"fan_id" uuid NOT NULL,
	"event_type" "fan_event_type" NOT NULL,
	"platform" text,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "fan_profiles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"email" text,
	"phone" text,
	"telegram_id" text,
	"instagram_handle" text,
	"tiktok_handle" text,
	"youtube_handle" text,
	"country" text,
	"city" text,
	"source" text,
	"emotional_segment" text,
	"superfan_score" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "release_tasks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"release_id" uuid NOT NULL,
	"task_name" text NOT NULL,
	"task_category" "task_category" NOT NULL,
	"status" "task_status" DEFAULT 'todo' NOT NULL,
	"due_date" date,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "releases" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"song_id" uuid NOT NULL,
	"release_title" text NOT NULL,
	"release_type" "release_type" NOT NULL,
	"upc" text,
	"distributor" text,
	"release_date" date,
	"pre_save_url" text,
	"smart_link" text,
	"spotify_url" text,
	"apple_music_url" text,
	"audiomack_url" text,
	"boomplay_url" text,
	"youtube_url" text,
	"status" "release_publish_status" DEFAULT 'planning' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "royalty_sources" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"song_id" uuid NOT NULL,
	"platform" text NOT NULL,
	"royalty_type" "royalty_type" NOT NULL,
	"amount" numeric(12, 2) NOT NULL,
	"currency" text DEFAULT 'USD' NOT NULL,
	"period_start" date,
	"period_end" date,
	"source_file_url" text,
	"imported_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "song_assets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"song_id" uuid NOT NULL,
	"asset_type" "asset_type" NOT NULL,
	"file_url" text NOT NULL,
	"storage_provider" text,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "songs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"artist_id" uuid NOT NULL,
	"title" text NOT NULL,
	"alternate_title" text,
	"version" text,
	"isrc" text,
	"bpm" integer,
	"key" text,
	"genre" text,
	"mood" text,
	"energy_level" integer,
	"explicit" boolean DEFAULT false,
	"lyrics" text,
	"master_owner" text,
	"publishing_owner" text,
	"release_status" "song_release_status" DEFAULT 'draft' NOT NULL,
	"sync_ready" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "sync_pitches" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"song_id" uuid NOT NULL,
	"pitch_target" text NOT NULL,
	"contact_name" text,
	"contact_email" text,
	"opportunity_type" "sync_opportunity_type" NOT NULL,
	"mood_fit" text,
	"status" "sync_status" DEFAULT 'prospect' NOT NULL,
	"pitch_date" date,
	"follow_up_date" date,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"password_hash" text NOT NULL,
	"full_name" text NOT NULL,
	"role" "user_role" DEFAULT 'team' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "content_ideas" ADD CONSTRAINT "content_ideas_song_id_songs_id_fk" FOREIGN KEY ("song_id") REFERENCES "public"."songs"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "contributors" ADD CONSTRAINT "contributors_song_id_songs_id_fk" FOREIGN KEY ("song_id") REFERENCES "public"."songs"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "fan_events" ADD CONSTRAINT "fan_events_fan_id_fan_profiles_id_fk" FOREIGN KEY ("fan_id") REFERENCES "public"."fan_profiles"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "release_tasks" ADD CONSTRAINT "release_tasks_release_id_releases_id_fk" FOREIGN KEY ("release_id") REFERENCES "public"."releases"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "releases" ADD CONSTRAINT "releases_song_id_songs_id_fk" FOREIGN KEY ("song_id") REFERENCES "public"."songs"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "royalty_sources" ADD CONSTRAINT "royalty_sources_song_id_songs_id_fk" FOREIGN KEY ("song_id") REFERENCES "public"."songs"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "song_assets" ADD CONSTRAINT "song_assets_song_id_songs_id_fk" FOREIGN KEY ("song_id") REFERENCES "public"."songs"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "songs" ADD CONSTRAINT "songs_artist_id_artist_profiles_id_fk" FOREIGN KEY ("artist_id") REFERENCES "public"."artist_profiles"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "sync_pitches" ADD CONSTRAINT "sync_pitches_song_id_songs_id_fk" FOREIGN KEY ("song_id") REFERENCES "public"."songs"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "automation_runs_status_idx" ON "automation_runs" USING btree ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "automation_runs_workflow_name_idx" ON "automation_runs" USING btree ("workflow_name");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "content_ideas_song_id_idx" ON "content_ideas" USING btree ("song_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "content_ideas_status_idx" ON "content_ideas" USING btree ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "contributors_song_id_idx" ON "contributors" USING btree ("song_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "crm_contacts_contact_type_idx" ON "crm_contacts" USING btree ("contact_type");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "crm_contacts_email_idx" ON "crm_contacts" USING btree ("email");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "fan_events_fan_id_idx" ON "fan_events" USING btree ("fan_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "fan_events_event_type_idx" ON "fan_events" USING btree ("event_type");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "fan_profiles_email_idx" ON "fan_profiles" USING btree ("email");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "release_tasks_release_id_idx" ON "release_tasks" USING btree ("release_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "release_tasks_status_idx" ON "release_tasks" USING btree ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "releases_song_id_idx" ON "releases" USING btree ("song_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "releases_status_idx" ON "releases" USING btree ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "royalty_sources_song_id_idx" ON "royalty_sources" USING btree ("song_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "royalty_sources_platform_idx" ON "royalty_sources" USING btree ("platform");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "song_assets_song_id_idx" ON "song_assets" USING btree ("song_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "songs_artist_id_idx" ON "songs" USING btree ("artist_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "songs_release_status_idx" ON "songs" USING btree ("release_status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "sync_pitches_song_id_idx" ON "sync_pitches" USING btree ("song_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "sync_pitches_status_idx" ON "sync_pitches" USING btree ("status");
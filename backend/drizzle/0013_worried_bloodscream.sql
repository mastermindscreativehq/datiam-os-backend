DO $$ BEGIN
 CREATE TYPE "public"."emotion_type" AS ENUM('grief', 'trauma', 'rage', 'joy', 'melancholy', 'euphoria', 'anxiety', 'longing', 'triumph', 'nostalgia', 'peace', 'defiance');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."intention_type" AS ENUM('heal_listener', 'inspire_action', 'create_nostalgia', 'deliver_message', 'uplift_spirit', 'provoke_thought', 'celebrate_truth', 'process_pain');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."music_release_status" AS ENUM('draft', 'scheduled', 'released');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."release_state" AS ENUM('draft', 'blocked', 'almost_ready', 'ready_for_distribution', 'scheduled', 'released');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."session_status" AS ENUM('draft', 'active', 'completed');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."transformation_type" AS ENUM('from_pain_to_peace', 'from_stagnation_to_momentum', 'from_confusion_to_clarity', 'from_isolation_to_belonging', 'from_fear_to_courage', 'from_grief_to_acceptance', 'from_doubt_to_conviction', 'from_chaos_to_order');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "activity_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"user_email" text,
	"user_name" text,
	"action" text,
	"entity_name" text,
	"event_type" text,
	"module" text,
	"entity_type" text,
	"entity_id" text,
	"title" text,
	"description" text,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"severity" text DEFAULT 'info' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "artist_memory" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"artist_id" uuid NOT NULL,
	"dominant_emotion" "emotion_type",
	"recurring_themes" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"preferred_keys" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"avg_bpm_min" integer,
	"avg_bpm_max" integer,
	"session_count" integer DEFAULT 0 NOT NULL,
	"last_session_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "artist_memory_artist_id_unique" UNIQUE("artist_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "creative_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"artist_id" uuid,
	"name" text NOT NULL,
	"emotion" "emotion_type" NOT NULL,
	"intention" "intention_type" NOT NULL,
	"story" text,
	"listener_transformation" "transformation_type" NOT NULL,
	"status" "session_status" DEFAULT 'active' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "emotional_profiles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"artist_id" uuid,
	"session_id" uuid,
	"emotion" "emotion_type" NOT NULL,
	"intention" "intention_type" NOT NULL,
	"story" text,
	"listener_transformation" "transformation_type" NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "release_checklists" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"release_id" uuid NOT NULL,
	"lyrics_ready" boolean DEFAULT false NOT NULL,
	"cover_art_ready" boolean DEFAULT false NOT NULL,
	"mix_ready" boolean DEFAULT false NOT NULL,
	"master_ready" boolean DEFAULT false NOT NULL,
	"metadata_ready" boolean DEFAULT false NOT NULL,
	"isrc_ready" boolean DEFAULT false NOT NULL,
	"upc_ready" boolean DEFAULT false NOT NULL,
	"distributor_ready" boolean DEFAULT false NOT NULL,
	"release_date_ready" boolean DEFAULT false NOT NULL,
	"promo_assets_ready" boolean DEFAULT false NOT NULL,
	"sync_assets_ready" boolean DEFAULT false NOT NULL,
	"final_approval" boolean DEFAULT false NOT NULL,
	"notes" text,
	"readiness_status" text DEFAULT 'not_ready' NOT NULL,
	"completion_percent" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "release_checklists_release_id_unique" UNIQUE("release_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "schema_migrations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"migration_name" text NOT NULL,
	"executed_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "schema_migrations_migration_name_unique" UNIQUE("migration_name")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "song_blueprints" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" uuid NOT NULL,
	"artist_id" uuid,
	"bpm" integer NOT NULL,
	"musical_key" text NOT NULL,
	"scale" text NOT NULL,
	"atmosphere" text NOT NULL,
	"cadence_energy" text NOT NULL,
	"chord_direction" text NOT NULL,
	"vocal_energy" text NOT NULL,
	"hook_intensity" text NOT NULL,
	"engine_version" text DEFAULT 'v1' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "sonic_world_blueprints" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" uuid NOT NULL,
	"artist_id" uuid NOT NULL,
	"primary_genre" text NOT NULL,
	"secondary_genre" text NOT NULL,
	"rhythm_influence" text NOT NULL,
	"sonic_fusion_identity" text NOT NULL,
	"drum_style" text NOT NULL,
	"percussion_textures" text NOT NULL,
	"bass_character" text NOT NULL,
	"melodic_instruments" text NOT NULL,
	"ambient_layers" text NOT NULL,
	"organic_synthetic_ratio" text NOT NULL,
	"vocal_texture" text NOT NULL,
	"cadence_energy" text NOT NULL,
	"harmony_behavior" text NOT NULL,
	"emotional_intensity" text NOT NULL,
	"vocal_atmosphere" text NOT NULL,
	"visual_sonic_atmosphere" text NOT NULL,
	"emotional_weather" text NOT NULL,
	"scene_energy" text NOT NULL,
	"cinematic_references" text NOT NULL,
	"bpm" integer NOT NULL,
	"groove_behavior" text NOT NULL,
	"movement_energy" text NOT NULL,
	"percussion_complexity" text NOT NULL,
	"swing_characteristics" text NOT NULL,
	"musical_key" text NOT NULL,
	"scale" text NOT NULL,
	"chord_behavior" text NOT NULL,
	"emotional_progression" text NOT NULL,
	"tension_release_behavior" text NOT NULL,
	"hook_intensity" text NOT NULL,
	"chant_potential" text NOT NULL,
	"replayability" text NOT NULL,
	"anthem_potential" text NOT NULL,
	"crowd_engagement_energy" text NOT NULL,
	"cinematic_density" integer DEFAULT 50 NOT NULL,
	"spiritual_intensity" integer DEFAULT 50 NOT NULL,
	"emotional_rawness" integer DEFAULT 50 NOT NULL,
	"commercial_accessibility" integer DEFAULT 50 NOT NULL,
	"darkness_vs_hope" integer DEFAULT 50 NOT NULL,
	"underground_vs_mainstream" integer DEFAULT 50 NOT NULL,
	"organic_vs_synthetic" integer DEFAULT 50 NOT NULL,
	"producer_brief" text NOT NULL,
	"coherence_score" numeric(4, 2) DEFAULT '0.85' NOT NULL,
	"engine_version" text DEFAULT 'sw-v1' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "activity_log" ADD CONSTRAINT "activity_log_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "artist_memory" ADD CONSTRAINT "artist_memory_artist_id_artist_profiles_id_fk" FOREIGN KEY ("artist_id") REFERENCES "public"."artist_profiles"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "creative_sessions" ADD CONSTRAINT "creative_sessions_artist_id_artist_profiles_id_fk" FOREIGN KEY ("artist_id") REFERENCES "public"."artist_profiles"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "emotional_profiles" ADD CONSTRAINT "emotional_profiles_artist_id_artist_profiles_id_fk" FOREIGN KEY ("artist_id") REFERENCES "public"."artist_profiles"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "emotional_profiles" ADD CONSTRAINT "emotional_profiles_session_id_creative_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."creative_sessions"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "release_checklists" ADD CONSTRAINT "release_checklists_release_id_releases_id_fk" FOREIGN KEY ("release_id") REFERENCES "public"."releases"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "song_blueprints" ADD CONSTRAINT "song_blueprints_session_id_creative_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."creative_sessions"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "song_blueprints" ADD CONSTRAINT "song_blueprints_artist_id_artist_profiles_id_fk" FOREIGN KEY ("artist_id") REFERENCES "public"."artist_profiles"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "sonic_world_blueprints" ADD CONSTRAINT "sonic_world_blueprints_session_id_creative_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."creative_sessions"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "sonic_world_blueprints" ADD CONSTRAINT "sonic_world_blueprints_artist_id_artist_profiles_id_fk" FOREIGN KEY ("artist_id") REFERENCES "public"."artist_profiles"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "activity_log_user_id_idx" ON "activity_log" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "activity_log_action_idx" ON "activity_log" USING btree ("action");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "activity_log_entity_type_idx" ON "activity_log" USING btree ("entity_type");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "activity_log_created_at_idx" ON "activity_log" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "activity_log_event_type_idx" ON "activity_log" USING btree ("event_type");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "activity_log_module_idx" ON "activity_log" USING btree ("module");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "activity_log_severity_idx" ON "activity_log" USING btree ("severity");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "artist_memory_artist_id_idx" ON "artist_memory" USING btree ("artist_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "creative_sessions_artist_id_idx" ON "creative_sessions" USING btree ("artist_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "creative_sessions_emotion_idx" ON "creative_sessions" USING btree ("emotion");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "creative_sessions_status_idx" ON "creative_sessions" USING btree ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "emotional_profiles_artist_id_idx" ON "emotional_profiles" USING btree ("artist_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "emotional_profiles_emotion_idx" ON "emotional_profiles" USING btree ("emotion");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "emotional_profiles_session_id_idx" ON "emotional_profiles" USING btree ("session_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "release_checklists_release_id_idx" ON "release_checklists" USING btree ("release_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "release_checklists_readiness_idx" ON "release_checklists" USING btree ("readiness_status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "song_blueprints_session_id_idx" ON "song_blueprints" USING btree ("session_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "song_blueprints_artist_id_idx" ON "song_blueprints" USING btree ("artist_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "sw_blueprints_session_id_idx" ON "sonic_world_blueprints" USING btree ("session_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "sw_blueprints_artist_id_idx" ON "sonic_world_blueprints" USING btree ("artist_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "sw_blueprints_created_at_idx" ON "sonic_world_blueprints" USING btree ("created_at");--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "releases" ADD CONSTRAINT "releases_artist_id_artist_profiles_id_fk" FOREIGN KEY ("artist_id") REFERENCES "public"."artist_profiles"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "songs" ADD CONSTRAINT "songs_release_id_releases_id_fk" FOREIGN KEY ("release_id") REFERENCES "public"."releases"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "releases_artist_id_idx" ON "releases" USING btree ("artist_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "releases_slug_idx" ON "releases" USING btree ("slug");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "releases_release_date_idx" ON "releases" USING btree ("release_date");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "releases_music_status_idx" ON "releases" USING btree ("music_status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "releases_release_state_idx" ON "releases" USING btree ("release_state");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "songs_release_id_idx" ON "songs" USING btree ("release_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "songs_slug_idx" ON "songs" USING btree ("slug");
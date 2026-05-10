DO $$ BEGIN
 CREATE TYPE "public"."job_status" AS ENUM('active', 'paused', 'completed', 'failed');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."job_type" AS ENUM('fan_sync', 'release_reminder', 'content_suggestion', 'royalty_import', 'sync_follow_up', 'analytics_snapshot');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."recommendation_type" AS ENUM('content', 'release_timing', 'sync_pitch', 'fan_engagement', 'marketing');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."rec_entity_type" AS ENUM('song', 'release', 'fan', 'content_idea', 'sync_pitch');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "scheduled_jobs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"job_name" text NOT NULL,
	"job_type" "job_type" NOT NULL,
	"cron_expression" text,
	"run_once_at" timestamp,
	"payload" jsonb,
	"status" "job_status" DEFAULT 'active' NOT NULL,
	"last_run_at" timestamp,
	"next_run_at" timestamp,
	"run_count" integer DEFAULT 0 NOT NULL,
	"last_error" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "ai_recommendations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"recommendation_type" "recommendation_type" NOT NULL,
	"entity_type" "rec_entity_type" NOT NULL,
	"entity_id" uuid,
	"title" text NOT NULL,
	"body" text NOT NULL,
	"action_items" jsonb,
	"confidence_score" numeric(3, 2),
	"accepted" boolean,
	"dismissed" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "scheduled_jobs_status_idx" ON "scheduled_jobs" USING btree ("status");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "scheduled_jobs_type_idx" ON "scheduled_jobs" USING btree ("job_type");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "scheduled_jobs_next_run_idx" ON "scheduled_jobs" USING btree ("next_run_at");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "ai_recs_type_idx" ON "ai_recommendations" USING btree ("recommendation_type");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "ai_recs_entity_type_idx" ON "ai_recommendations" USING btree ("entity_type");

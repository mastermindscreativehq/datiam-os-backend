ALTER TYPE "public"."user_role" ADD VALUE IF NOT EXISTS 'editor';
--> statement-breakpoint
ALTER TYPE "public"."user_role" ADD VALUE IF NOT EXISTS 'viewer';
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "activity_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid REFERENCES "users"("id") ON DELETE SET NULL,
	"user_email" text NOT NULL,
	"user_name" text,
	"action" text NOT NULL,
	"entity_type" text NOT NULL,
	"entity_id" text,
	"entity_name" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "activity_log_user_id_idx" ON "activity_log" USING btree ("user_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "activity_log_action_idx" ON "activity_log" USING btree ("action");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "activity_log_entity_type_idx" ON "activity_log" USING btree ("entity_type");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "activity_log_created_at_idx" ON "activity_log" USING btree ("created_at");

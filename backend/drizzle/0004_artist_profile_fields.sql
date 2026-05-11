ALTER TABLE "artist_profiles" ADD COLUMN IF NOT EXISTS "genre" text;
--> statement-breakpoint
ALTER TABLE "artist_profiles" ADD COLUMN IF NOT EXISTS "primary_color" text;
--> statement-breakpoint
ALTER TABLE "artist_profiles" ADD COLUMN IF NOT EXISTS "mood_profile" text;
--> statement-breakpoint
ALTER TABLE "artist_profiles" ADD COLUMN IF NOT EXISTS "social_links" jsonb;
--> statement-breakpoint
ALTER TABLE "artist_profiles" ADD COLUMN IF NOT EXISTS "profile_image" text;
--> statement-breakpoint
ALTER TABLE "artist_profiles" ADD COLUMN IF NOT EXISTS "is_active" boolean NOT NULL DEFAULT true;

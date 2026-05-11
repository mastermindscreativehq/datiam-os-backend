CREATE TABLE IF NOT EXISTS "schema_migrations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"migration_name" text UNIQUE NOT NULL,
	"executed_at" timestamptz DEFAULT now()
);
--> statement-breakpoint
INSERT INTO "schema_migrations" ("migration_name") VALUES
  ('0000_harsh_gressill'),
  ('0001_add_scheduler_ai_tables'),
  ('0002_uneven_mephisto'),
  ('0003_activity_log_and_roles'),
  ('0004_artist_profile_fields'),
  ('0005_schema_migrations')
ON CONFLICT ("migration_name") DO NOTHING;

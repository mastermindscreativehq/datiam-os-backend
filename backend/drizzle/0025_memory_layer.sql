CREATE TABLE IF NOT EXISTS "company_memory" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "company_id" uuid NOT NULL UNIQUE REFERENCES "companies"("id") ON DELETE CASCADE,
  "total_opportunities" integer NOT NULL DEFAULT 0,
  "total_placements" integer NOT NULL DEFAULT 0,
  "total_revenue" numeric(14,2) NOT NULL DEFAULT 0,
  "avg_deal_size" numeric(14,2) NOT NULL DEFAULT 0,
  "preferred_genres" jsonb NOT NULL DEFAULT '[]',
  "preferred_bpm_ranges" jsonb NOT NULL DEFAULT '[]',
  "preferred_moods" jsonb NOT NULL DEFAULT '[]',
  "preferred_license_types" jsonb NOT NULL DEFAULT '[]',
  "response_rate" numeric(5,4) NOT NULL DEFAULT 0,
  "placement_rate" numeric(5,4) NOT NULL DEFAULT 0,
  "last_contacted_at" timestamptz,
  "memory_updated_at" timestamptz NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "company_memory_company_id_idx" ON "company_memory" ("company_id");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "contact_memory" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "contact_id" uuid NOT NULL UNIQUE REFERENCES "licensing_contacts"("id") ON DELETE CASCADE,
  "opportunities_seen" integer NOT NULL DEFAULT 0,
  "placements_closed" integer NOT NULL DEFAULT 0,
  "avg_response_time_days" numeric(8,2),
  "preferred_genres" jsonb NOT NULL DEFAULT '[]',
  "preferred_license_types" jsonb NOT NULL DEFAULT '[]',
  "relationship_strength" numeric(3,2) NOT NULL DEFAULT 0,
  "success_rate" numeric(5,4) NOT NULL DEFAULT 0,
  "notes_summary" text,
  "memory_updated_at" timestamptz NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "contact_memory_contact_id_idx" ON "contact_memory" ("contact_id");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "artist_sync_memory" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "artist_id" uuid NOT NULL UNIQUE REFERENCES "artist_profiles"("id") ON DELETE CASCADE,
  "opportunities_submitted" integer NOT NULL DEFAULT 0,
  "placements_won" integer NOT NULL DEFAULT 0,
  "total_sync_revenue" numeric(14,2) NOT NULL DEFAULT 0,
  "strongest_genres" jsonb NOT NULL DEFAULT '[]',
  "strongest_moods" jsonb NOT NULL DEFAULT '[]',
  "strongest_territories" jsonb NOT NULL DEFAULT '[]',
  "strongest_bpm_ranges" jsonb NOT NULL DEFAULT '[]',
  "success_rate" numeric(5,4) NOT NULL DEFAULT 0,
  "memory_updated_at" timestamptz NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "artist_sync_memory_artist_id_idx" ON "artist_sync_memory" ("artist_id");

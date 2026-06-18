-- =============================================================================
-- DATIAM Outreach Engine v1
-- Migration 0028: outreach_campaign + outreach_message tables
-- =============================================================================

DO $$ BEGIN
  CREATE TYPE outreach_status AS ENUM (
    'draft',
    'queued',
    'sent',
    'replied',
    'closed'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "outreach_campaign" (
  "id"                uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "artist_id"         uuid REFERENCES "artist_profiles"("id") ON DELETE SET NULL,
  "company_id"        uuid NOT NULL REFERENCES "companies"("id") ON DELETE CASCADE,
  "contact_id"        uuid REFERENCES "licensing_contacts"("id") ON DELETE SET NULL,
  "opportunity_id"    uuid REFERENCES "placement_opportunities"("id") ON DELETE SET NULL,
  "opportunity_score" numeric(5,2),
  "territory"         text NOT NULL DEFAULT 'worldwide',
  "status"            outreach_status NOT NULL DEFAULT 'draft',
  "notes"             text,
  "created_at"        timestamptz NOT NULL DEFAULT now(),
  "updated_at"        timestamptz NOT NULL DEFAULT now()
);
--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "oc_artist_id_idx"      ON "outreach_campaign" ("artist_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "oc_company_id_idx"     ON "outreach_campaign" ("company_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "oc_contact_id_idx"     ON "outreach_campaign" ("contact_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "oc_status_idx"         ON "outreach_campaign" ("status");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "oc_created_at_idx"     ON "outreach_campaign" ("created_at");
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "outreach_message" (
  "id"          uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "campaign_id" uuid NOT NULL REFERENCES "outreach_campaign"("id") ON DELETE CASCADE,
  "pitch"       text NOT NULL,
  "reasoning"   text NOT NULL,
  "status"      outreach_status NOT NULL DEFAULT 'draft',
  "metadata"    jsonb,
  "created_at"  timestamptz NOT NULL DEFAULT now(),
  "updated_at"  timestamptz NOT NULL DEFAULT now()
);
--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "om_campaign_id_idx"    ON "outreach_message" ("campaign_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "om_status_idx"         ON "outreach_message" ("status");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "om_created_at_idx"     ON "outreach_message" ("created_at");

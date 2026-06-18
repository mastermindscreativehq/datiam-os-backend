-- =============================================================================
-- DATIAM Execution Engine v1
-- Migration 0029: execution_log table
-- =============================================================================

DO $$ BEGIN
  CREATE TYPE delivery_status AS ENUM (
    'pending',
    'sent',
    'failed',
    'bounced',
    'opened',
    'clicked'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "execution_log" (
  "id"                    uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "campaign_id"           uuid NOT NULL REFERENCES "outreach_campaign"("id") ON DELETE CASCADE,
  "message_id"            uuid REFERENCES "outreach_message"("id") ON DELETE SET NULL,
  "contact_id"            uuid REFERENCES "licensing_contacts"("id") ON DELETE SET NULL,
  "provider"              text NOT NULL,
  "recipient_email"       text NOT NULL,
  "subject"               text NOT NULL,
  "delivery_status"       delivery_status NOT NULL DEFAULT 'pending',
  "sent_at"               timestamptz,
  "error_message"         text,
  "provider_message_id"   text,
  "metadata"              jsonb,
  "created_at"            timestamptz NOT NULL DEFAULT now(),
  "updated_at"            timestamptz NOT NULL DEFAULT now()
);
--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "el_campaign_id_idx"      ON "execution_log" ("campaign_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "el_contact_id_idx"       ON "execution_log" ("contact_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "el_delivery_status_idx"  ON "execution_log" ("delivery_status");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "el_sent_at_idx"          ON "execution_log" ("sent_at");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "el_provider_idx"         ON "execution_log" ("provider");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "el_created_at_idx"       ON "execution_log" ("created_at");

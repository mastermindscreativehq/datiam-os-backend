-- =============================================================================
-- DATIAM Reply Intelligence Engine v1
-- Migration 0030: reply_log table + contact_memory reply signal columns
-- =============================================================================

DO $$ BEGIN
  CREATE TYPE reply_status AS ENUM (
    'positive',
    'interested',
    'meeting_requested',
    'needs_followup',
    'not_now',
    'rejected',
    'out_of_office',
    'unknown'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "reply_log" (
  "id"                      uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "campaign_id"             uuid NOT NULL REFERENCES "outreach_campaign"("id") ON DELETE CASCADE,
  "contact_id"              uuid REFERENCES "licensing_contacts"("id") ON DELETE SET NULL,
  "subject"                 text NOT NULL,
  "body"                    text NOT NULL,
  "status"                  reply_status NOT NULL DEFAULT 'unknown',
  "confidence"              numeric(3,2) NOT NULL DEFAULT 0,
  "reasoning"               text,
  "recommended_next_action" text,
  "raw_ai_response"         text,
  "created_at"              timestamptz NOT NULL DEFAULT now(),
  "updated_at"              timestamptz NOT NULL DEFAULT now()
);
--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "rl_campaign_id_idx" ON "reply_log" ("campaign_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "rl_contact_id_idx"  ON "reply_log" ("contact_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "rl_status_idx"      ON "reply_log" ("status");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "rl_created_at_idx"  ON "reply_log" ("created_at");
--> statement-breakpoint

ALTER TABLE "contact_memory"
  ADD COLUMN IF NOT EXISTS "total_replies"    integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "positive_replies" integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "negative_replies" integer NOT NULL DEFAULT 0;
--> statement-breakpoint

INSERT INTO "adaptive_weight" (factor_name, current_weight, confidence, sample_size)
  VALUES
    ('reply_positive_rate', 0.00, 0.00, 0),
    ('reply_rejection_rate', 0.00, 0.00, 0)
  ON CONFLICT (factor_name) DO NOTHING;

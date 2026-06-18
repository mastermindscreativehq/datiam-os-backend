-- DATIAM Meeting Intelligence Engine v1
-- Migration 0031

CREATE TYPE meeting_status AS ENUM ('scheduled', 'confirmed', 'completed', 'cancelled', 'no_show');
--> statement-breakpoint
CREATE TYPE meeting_type AS ENUM ('discovery', 'pitch', 'licensing', 'sync', 'partnership', 'followup');
--> statement-breakpoint

CREATE TABLE meetings (
  id                       uuid        PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  campaign_id              uuid        NOT NULL REFERENCES outreach_campaign(id) ON DELETE CASCADE,
  contact_id               uuid        REFERENCES licensing_contacts(id) ON DELETE SET NULL,
  reply_log_id             uuid        REFERENCES reply_log(id) ON DELETE SET NULL,
  meeting_title            text        NOT NULL,
  meeting_type             meeting_type NOT NULL DEFAULT 'discovery',
  scheduled_at             timestamptz,
  timezone                 text        NOT NULL DEFAULT 'UTC',
  meeting_link             text,
  status                   meeting_status NOT NULL DEFAULT 'scheduled',
  notes                    text,
  meeting_brief            jsonb,
  meeting_preparation_score numeric(3,2),
  recommended_next_action  text,
  contact_context          jsonb,
  campaign_context         jsonb,
  reply_context            jsonb,
  confidence_score         numeric(3,2),
  engine_version           text        NOT NULL DEFAULT 'meeting-intelligence-v1',
  created_at               timestamptz NOT NULL DEFAULT now(),
  updated_at               timestamptz NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE INDEX meetings_campaign_id_idx   ON meetings(campaign_id);
--> statement-breakpoint
CREATE INDEX meetings_contact_id_idx    ON meetings(contact_id);
--> statement-breakpoint
CREATE INDEX meetings_status_idx        ON meetings(status);
--> statement-breakpoint
CREATE INDEX meetings_scheduled_at_idx  ON meetings(scheduled_at);
--> statement-breakpoint
CREATE INDEX meetings_reply_log_id_idx  ON meetings(reply_log_id);
--> statement-breakpoint
CREATE INDEX meetings_created_at_idx    ON meetings(created_at);
--> statement-breakpoint

-- Extend contact_memory to track meeting outcomes
ALTER TABLE contact_memory
  ADD COLUMN IF NOT EXISTS meetings_scheduled      integer      NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS meetings_completed      integer      NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS meetings_cancelled      integer      NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS meeting_conversion_rate numeric(5,4) NOT NULL DEFAULT 0;
--> statement-breakpoint

-- Seed adaptive weight rows for meeting signals
INSERT INTO adaptive_weight (factor_name, current_weight, confidence, sample_size)
VALUES
  ('meeting_success_rate',    0.00, 0.00, 0),
  ('meeting_completion_rate', 0.00, 0.00, 0),
  ('meeting_no_show_rate',    0.00, 0.00, 0)
ON CONFLICT (factor_name) DO NOTHING;

-- DATIAM Deal Intelligence Engine v1
-- Migration 0032

CREATE TYPE deal_status AS ENUM ('open', 'won', 'lost', 'cancelled');
--> statement-breakpoint
CREATE TYPE deal_stage AS ENUM (
  'lead',
  'contacted',
  'replied',
  'meeting_scheduled',
  'meeting_completed',
  'proposal_sent',
  'negotiation',
  'contract_sent',
  'contract_signed',
  'won',
  'lost'
);
--> statement-breakpoint

CREATE TABLE deals (
  id                       uuid        PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  meeting_id               uuid        REFERENCES meetings(id) ON DELETE SET NULL,
  campaign_id              uuid        REFERENCES outreach_campaign(id) ON DELETE SET NULL,
  contact_id               uuid        REFERENCES licensing_contacts(id) ON DELETE SET NULL,
  company_id               uuid        REFERENCES companies(id) ON DELETE SET NULL,
  deal_name                text        NOT NULL,
  deal_type                text,
  status                   deal_status NOT NULL DEFAULT 'open',
  stage                    deal_stage  NOT NULL DEFAULT 'meeting_completed',
  projected_value          numeric(14,2),
  actual_value             numeric(14,2),
  probability              numeric(5,2),
  expected_close_date      date,
  closed_at                timestamptz,
  notes                    text,
  deal_score               numeric(3,2),
  win_probability          numeric(5,2),
  recommended_next_action  text,
  revenue_forecast         numeric(14,2),
  intelligence_context     jsonb,
  engine_version           text        NOT NULL DEFAULT 'deal-intelligence-v1',
  created_at               timestamptz NOT NULL DEFAULT now(),
  updated_at               timestamptz NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE INDEX deals_meeting_id_idx    ON deals(meeting_id);
--> statement-breakpoint
CREATE INDEX deals_campaign_id_idx   ON deals(campaign_id);
--> statement-breakpoint
CREATE INDEX deals_contact_id_idx    ON deals(contact_id);
--> statement-breakpoint
CREATE INDEX deals_company_id_idx    ON deals(company_id);
--> statement-breakpoint
CREATE INDEX deals_status_idx        ON deals(status);
--> statement-breakpoint
CREATE INDEX deals_stage_idx         ON deals(stage);
--> statement-breakpoint
CREATE INDEX deals_created_at_idx    ON deals(created_at);
--> statement-breakpoint

-- Extend contact_memory to track deal outcomes
ALTER TABLE contact_memory
  ADD COLUMN IF NOT EXISTS deals_created      integer      NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS deals_won          integer      NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS deals_lost         integer      NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS revenue_generated  numeric(14,2) NOT NULL DEFAULT 0;
--> statement-breakpoint

-- Extend company_memory to track deal outcomes
ALTER TABLE company_memory
  ADD COLUMN IF NOT EXISTS deals_created      integer      NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS deals_won          integer      NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS deals_lost         integer      NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS revenue_generated  numeric(14,2) NOT NULL DEFAULT 0;
--> statement-breakpoint

-- Seed adaptive weight rows for deal intelligence signals
INSERT INTO adaptive_weight (factor_name, current_weight, confidence, sample_size)
VALUES
  ('deal_win_rate',          0.00, 0.00, 0),
  ('average_deal_value',     0.00, 0.00, 0),
  ('revenue_per_contact',    0.00, 0.00, 0),
  ('revenue_per_company',    0.00, 0.00, 0)
ON CONFLICT (factor_name) DO NOTHING;

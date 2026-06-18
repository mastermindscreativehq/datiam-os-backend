-- DATIAM Contract Intelligence Engine v1
-- Migration 0033

CREATE TYPE contract_status AS ENUM (
  'draft',
  'generated',
  'sent',
  'viewed',
  'signed',
  'expired',
  'cancelled'
);
--> statement-breakpoint

CREATE TABLE contracts (
  id                  uuid            PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  deal_id             uuid            REFERENCES deals(id) ON DELETE SET NULL,
  company_id          uuid            REFERENCES companies(id) ON DELETE SET NULL,
  contact_id          uuid            REFERENCES licensing_contacts(id) ON DELETE SET NULL,
  contract_title      text            NOT NULL,
  contract_type       text,
  contract_value      numeric(14,2),
  currency            text            NOT NULL DEFAULT 'USD',
  status              contract_status NOT NULL DEFAULT 'draft',
  generated_at        timestamptz,
  sent_at             timestamptz,
  viewed_at           timestamptz,
  signed_at           timestamptz,
  expires_at          timestamptz,
  file_url            text,
  signature_provider  text,
  metadata            jsonb,
  created_at          timestamptz     NOT NULL DEFAULT now(),
  updated_at          timestamptz     NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE INDEX contracts_deal_id_idx       ON contracts(deal_id);
--> statement-breakpoint
CREATE INDEX contracts_company_id_idx    ON contracts(company_id);
--> statement-breakpoint
CREATE INDEX contracts_contact_id_idx    ON contracts(contact_id);
--> statement-breakpoint
CREATE INDEX contracts_status_idx        ON contracts(status);
--> statement-breakpoint
CREATE INDEX contracts_created_at_idx    ON contracts(created_at);
--> statement-breakpoint

-- Extend contact_memory to track contract outcomes
ALTER TABLE contact_memory
  ADD COLUMN IF NOT EXISTS contracts_created  integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS contracts_sent     integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS contracts_signed   integer NOT NULL DEFAULT 0;
--> statement-breakpoint

-- Extend company_memory to track contract outcomes
ALTER TABLE company_memory
  ADD COLUMN IF NOT EXISTS contracts_created  integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS contracts_sent     integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS contracts_signed   integer NOT NULL DEFAULT 0;
--> statement-breakpoint

-- Seed adaptive weight rows for contract intelligence signals
INSERT INTO adaptive_weight (factor_name, current_weight, confidence, sample_size)
VALUES
  ('contract_conversion_rate',     0.00, 0.00, 0),
  ('average_time_to_signature',    0.00, 0.00, 0)
ON CONFLICT (factor_name) DO NOTHING;

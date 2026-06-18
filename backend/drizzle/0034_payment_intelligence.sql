-- DATIAM Payment Intelligence Engine v1
-- Migration 0034

CREATE TYPE payment_status AS ENUM (
  'pending',
  'invoice_sent',
  'partial',
  'paid',
  'overdue',
  'refunded',
  'cancelled'
);
--> statement-breakpoint

CREATE TABLE payments (
  id                    uuid           PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  contract_id           uuid           REFERENCES contracts(id) ON DELETE SET NULL,
  deal_id               uuid           REFERENCES deals(id) ON DELETE SET NULL,
  company_id            uuid           REFERENCES companies(id) ON DELETE SET NULL,
  contact_id            uuid           REFERENCES licensing_contacts(id) ON DELETE SET NULL,
  invoice_number        text           NOT NULL UNIQUE,
  payment_amount        numeric(14,2)  NOT NULL DEFAULT 0,
  currency              text           NOT NULL DEFAULT 'USD',
  payment_status        payment_status NOT NULL DEFAULT 'pending',
  invoice_sent_at       timestamptz,
  due_date              timestamptz,
  paid_at               timestamptz,
  payment_method        text,
  transaction_reference text,
  notes                 text,
  metadata              jsonb,
  created_at            timestamptz    NOT NULL DEFAULT now(),
  updated_at            timestamptz    NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE INDEX payments_contract_id_idx ON payments(contract_id);
--> statement-breakpoint
CREATE INDEX payments_deal_id_idx     ON payments(deal_id);
--> statement-breakpoint
CREATE INDEX payments_company_id_idx  ON payments(company_id);
--> statement-breakpoint
CREATE INDEX payments_contact_id_idx  ON payments(contact_id);
--> statement-breakpoint
CREATE INDEX payments_status_idx      ON payments(payment_status);
--> statement-breakpoint
CREATE INDEX payments_due_date_idx    ON payments(due_date);
--> statement-breakpoint
CREATE INDEX payments_created_at_idx  ON payments(created_at);
--> statement-breakpoint

-- Extend contact_memory to track payment outcomes
ALTER TABLE contact_memory
  ADD COLUMN IF NOT EXISTS payments_created  integer       NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS payments_paid     integer       NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS revenue_received  numeric(14,2) NOT NULL DEFAULT 0;
--> statement-breakpoint

-- Extend company_memory to track payment outcomes
ALTER TABLE company_memory
  ADD COLUMN IF NOT EXISTS payments_created  integer       NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS payments_paid     integer       NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS revenue_received  numeric(14,2) NOT NULL DEFAULT 0;
--> statement-breakpoint

-- Seed adaptive weight rows for payment intelligence signals
INSERT INTO adaptive_weight (factor_name, current_weight, confidence, sample_size)
VALUES
  ('average_collection_time', 0.00, 0.00, 0),
  ('revenue_per_company',     0.00, 0.00, 0),
  ('revenue_per_contact',     0.00, 0.00, 0)
ON CONFLICT (factor_name) DO NOTHING;

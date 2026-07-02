-- DATIAM Growth OS — CRM Extension (Music Growth CRM)
-- Migration 0044
--
-- Purpose: Extend crm_contacts into the full Music Growth CRM.
--   - Adds 12 new contact types to contact_type enum.
--   - Adds 11 new columns to crm_contacts (all nullable / with defaults).
--   - Creates contact_groups: named lists with optional filter criteria.
--   - Creates contact_group_members: many-to-many contacts ↔ groups.
--   - Creates conversation_history: channel-by-channel comms log per contact.
--
-- Backward compatible: all column additions are nullable or have safe defaults.
-- Existing crm_contacts rows and all existing CRUD endpoints are untouched.
--
-- Rollback:
--   DROP TABLE IF EXISTS conversation_history;
--   DROP TABLE IF EXISTS contact_group_members;
--   DROP TABLE IF EXISTS contact_groups;
--   ALTER TABLE crm_contacts
--     DROP COLUMN IF EXISTS followers,
--     DROP COLUMN IF EXISTS engagement_rate,
--     DROP COLUMN IF EXISTS website,
--     DROP COLUMN IF EXISTS social_links,
--     DROP COLUMN IF EXISTS genres,
--     DROP COLUMN IF EXISTS priority,
--     DROP COLUMN IF EXISTS tags,
--     DROP COLUMN IF EXISTS collaboration_score,
--     DROP COLUMN IF EXISTS city,
--     DROP COLUMN IF EXISTS country,
--     DROP COLUMN IF EXISTS country_id,
--     DROP COLUMN IF EXISTS updated_at;
--   DROP TYPE IF EXISTS conversation_direction;
--   DROP TYPE IF EXISTS conversation_channel;
--   DROP TYPE IF EXISTS crm_contact_priority;
--   (contact_type enum values cannot be removed without deleting rows using them.)

-- ── 1. Extend contact_type enum ────────────────────────────────────────────
ALTER TYPE contact_type ADD VALUE IF NOT EXISTS 'dance_creator';
--> statement-breakpoint
ALTER TYPE contact_type ADD VALUE IF NOT EXISTS 'choreographer';
--> statement-breakpoint
ALTER TYPE contact_type ADD VALUE IF NOT EXISTS 'content_creator';
--> statement-breakpoint
ALTER TYPE contact_type ADD VALUE IF NOT EXISTS 'manager';
--> statement-breakpoint
ALTER TYPE contact_type ADD VALUE IF NOT EXISTS 'label';
--> statement-breakpoint
ALTER TYPE contact_type ADD VALUE IF NOT EXISTS 'publisher';
--> statement-breakpoint
ALTER TYPE contact_type ADD VALUE IF NOT EXISTS 'brand';
--> statement-breakpoint
ALTER TYPE contact_type ADD VALUE IF NOT EXISTS 'festival';
--> statement-breakpoint
ALTER TYPE contact_type ADD VALUE IF NOT EXISTS 'promoter';
--> statement-breakpoint
ALTER TYPE contact_type ADD VALUE IF NOT EXISTS 'producer';
--> statement-breakpoint
ALTER TYPE contact_type ADD VALUE IF NOT EXISTS 'photographer';
--> statement-breakpoint
ALTER TYPE contact_type ADD VALUE IF NOT EXISTS 'videographer';
--> statement-breakpoint

-- ── 2. Supporting enums ────────────────────────────────────────────────────
DO $$ BEGIN
  CREATE TYPE crm_contact_priority AS ENUM ('low', 'medium', 'high', 'vip');
  EXCEPTION WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint

DO $$ BEGIN
  CREATE TYPE conversation_channel AS ENUM (
    'email', 'dm', 'call', 'meeting', 'whatsapp', 'other'
  );
  EXCEPTION WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint

DO $$ BEGIN
  CREATE TYPE conversation_direction AS ENUM ('inbound', 'outbound');
  EXCEPTION WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint

-- ── 3. Extend crm_contacts with Growth CRM fields ─────────────────────────
ALTER TABLE crm_contacts ADD COLUMN IF NOT EXISTS followers          bigint               NOT NULL DEFAULT 0;
--> statement-breakpoint
ALTER TABLE crm_contacts ADD COLUMN IF NOT EXISTS engagement_rate    numeric(6,4)         NOT NULL DEFAULT 0;
--> statement-breakpoint
ALTER TABLE crm_contacts ADD COLUMN IF NOT EXISTS website            text;
--> statement-breakpoint
ALTER TABLE crm_contacts ADD COLUMN IF NOT EXISTS social_links       jsonb                NOT NULL DEFAULT '{}'::jsonb;
--> statement-breakpoint
ALTER TABLE crm_contacts ADD COLUMN IF NOT EXISTS genres             jsonb                NOT NULL DEFAULT '[]'::jsonb;
--> statement-breakpoint
ALTER TABLE crm_contacts ADD COLUMN IF NOT EXISTS priority           crm_contact_priority NOT NULL DEFAULT 'medium';
--> statement-breakpoint
ALTER TABLE crm_contacts ADD COLUMN IF NOT EXISTS tags               jsonb                NOT NULL DEFAULT '[]'::jsonb;
--> statement-breakpoint
ALTER TABLE crm_contacts ADD COLUMN IF NOT EXISTS collaboration_score numeric(5,2)        NOT NULL DEFAULT 0;
--> statement-breakpoint
ALTER TABLE crm_contacts ADD COLUMN IF NOT EXISTS city               text;
--> statement-breakpoint
ALTER TABLE crm_contacts ADD COLUMN IF NOT EXISTS country            text;
--> statement-breakpoint
ALTER TABLE crm_contacts ADD COLUMN IF NOT EXISTS country_id         uuid                 REFERENCES countries(id) ON DELETE SET NULL;
--> statement-breakpoint
ALTER TABLE crm_contacts ADD COLUMN IF NOT EXISTS updated_at         timestamptz          NOT NULL DEFAULT now();
--> statement-breakpoint

-- ── 4. contact_groups ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS contact_groups (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  artist_id   uuid        REFERENCES artist_profiles(id) ON DELETE CASCADE,
  name        text        NOT NULL,
  description text,
  color       text        NOT NULL DEFAULT '#6366f1',
  criteria    jsonb       NOT NULL DEFAULT '{}'::jsonb,
  created_by  uuid        REFERENCES users(id) ON DELETE SET NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);
--> statement-breakpoint

-- ── 5. contact_group_members ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS contact_group_members (
  group_id   uuid        NOT NULL REFERENCES contact_groups(id) ON DELETE CASCADE,
  contact_id uuid        NOT NULL REFERENCES crm_contacts(id) ON DELETE CASCADE,
  added_by   uuid        REFERENCES users(id) ON DELETE SET NULL,
  added_at   timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (group_id, contact_id)
);
--> statement-breakpoint

-- ── 6. conversation_history ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS conversation_history (
  id          uuid                    PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  contact_id  uuid                    NOT NULL REFERENCES crm_contacts(id) ON DELETE CASCADE,
  channel     conversation_channel    NOT NULL DEFAULT 'email',
  direction   conversation_direction  NOT NULL DEFAULT 'outbound',
  subject     text,
  body        text                    NOT NULL,
  sent_at     timestamptz             NOT NULL DEFAULT now(),
  metadata    jsonb                   NOT NULL DEFAULT '{}'::jsonb,
  created_by  uuid                    REFERENCES users(id) ON DELETE SET NULL,
  created_at  timestamptz             NOT NULL DEFAULT now()
);
--> statement-breakpoint

-- ── 7. Indexes ─────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS crm_contacts_priority_idx             ON crm_contacts(priority);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS crm_contacts_collaboration_score_idx  ON crm_contacts(collaboration_score DESC);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS crm_contacts_country_id_idx           ON crm_contacts(country_id);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS crm_contacts_followers_idx            ON crm_contacts(followers DESC);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS contact_groups_artist_id_idx          ON contact_groups(artist_id);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS contact_group_members_contact_id_idx  ON contact_group_members(contact_id);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS conversation_history_contact_id_idx   ON conversation_history(contact_id);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS conversation_history_sent_at_idx      ON conversation_history(sent_at DESC);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS conversation_history_channel_idx      ON conversation_history(channel);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS conversation_history_contact_sent_idx ON conversation_history(contact_id, sent_at DESC);

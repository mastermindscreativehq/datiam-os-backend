-- DATIAM OS — Campaigns table schema alignment (pre-existing drift fix)
-- Migration 0055
--
-- Purpose: the live `campaigns` table (created by an earlier hand-written
-- migration) has drifted from the Drizzle model in growth-schema.ts —
-- discovered while implementing Phase 3b (release_campaigns consolidation),
-- which writes to this table via that model. This is a pre-existing bug
-- affecting campaign-manager's own CRUD too (its service already queries
-- `campaigns.campaign_type`, which doesn't exist on the live table), not
-- something introduced by Phase 3b. The enum TYPES themselves
-- (growth_campaign_type/status/stage) are already correct on the live
-- table with the right values — only two column names are wrong and seven
-- columns are missing entirely.
--
-- The table has 0 rows in every environment checked, so this is a pure
-- rename + additive migration — no data to lose, nothing dropped. The
-- three extra live-only columns (currency, countries, platforms) are left
-- in place untouched; Drizzle simply doesn't reference them, and dropping
-- working columns isn't necessary to fix the drift.
--
-- Rollback:
--   ALTER TABLE campaigns RENAME COLUMN name TO title;
--   ALTER TABLE campaigns RENAME COLUMN campaign_type TO type;
--   ALTER TABLE campaigns DROP COLUMN IF EXISTS budget_spent;
--   ALTER TABLE campaigns DROP COLUMN IF EXISTS target_streams;
--   ALTER TABLE campaigns DROP COLUMN IF EXISTS target_followers;
--   ALTER TABLE campaigns DROP COLUMN IF EXISTS target_reach;
--   ALTER TABLE campaigns DROP COLUMN IF EXISTS actual_streams;
--   ALTER TABLE campaigns DROP COLUMN IF EXISTS actual_followers;
--   ALTER TABLE campaigns DROP COLUMN IF EXISTS actual_reach;
--   ALTER TABLE campaigns DROP COLUMN IF EXISTS ai_notes;

ALTER TABLE "campaigns" RENAME COLUMN "title" TO "name";
--> statement-breakpoint
ALTER TABLE "campaigns" RENAME COLUMN "type" TO "campaign_type";
--> statement-breakpoint
ALTER TABLE "campaigns" ADD COLUMN IF NOT EXISTS "budget_spent" numeric(12, 2) DEFAULT '0' NOT NULL;
--> statement-breakpoint
ALTER TABLE "campaigns" ADD COLUMN IF NOT EXISTS "target_streams" bigint;
--> statement-breakpoint
ALTER TABLE "campaigns" ADD COLUMN IF NOT EXISTS "target_followers" bigint;
--> statement-breakpoint
ALTER TABLE "campaigns" ADD COLUMN IF NOT EXISTS "target_reach" bigint;
--> statement-breakpoint
ALTER TABLE "campaigns" ADD COLUMN IF NOT EXISTS "actual_streams" bigint DEFAULT 0 NOT NULL;
--> statement-breakpoint
ALTER TABLE "campaigns" ADD COLUMN IF NOT EXISTS "actual_followers" bigint DEFAULT 0 NOT NULL;
--> statement-breakpoint
ALTER TABLE "campaigns" ADD COLUMN IF NOT EXISTS "actual_reach" bigint DEFAULT 0 NOT NULL;
--> statement-breakpoint
ALTER TABLE "campaigns" ADD COLUMN IF NOT EXISTS "ai_notes" text;

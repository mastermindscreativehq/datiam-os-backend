-- DATIAM OS — Labels as a Companies type
-- Migration 0054
--
-- Purpose: per the frozen architecture (plans/datiam-os-architecture-freeze.md),
-- Labels is not a separate entity — it's a `company_type` classification on
-- the existing `companies` table (companies/ module), matching how
-- Albums/EPs/Singles are a `release_type` classification on `releases`
-- rather than separate tables. Additive only — adds one enum value.
--
-- Rollback:
--   Postgres cannot remove a single enum value without recreating the type;
--   if this needs reverting, recreate company_type without 'label' and
--   reassign any rows using it to 'other' first.

ALTER TYPE "company_type" ADD VALUE IF NOT EXISTS 'label';

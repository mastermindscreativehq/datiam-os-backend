-- 0014_sonic_world_stabilization.sql
-- Sonic World Stabilization Layer: audit trail + generation metadata

ALTER TABLE sonic_world_blueprints
  ADD COLUMN IF NOT EXISTS raw_generation       jsonb,
  ADD COLUMN IF NOT EXISTS repaired_generation  jsonb,
  ADD COLUMN IF NOT EXISTS validation_report    jsonb,
  ADD COLUMN IF NOT EXISTS confidence_score     numeric(4,2) NOT NULL DEFAULT 1.00,
  ADD COLUMN IF NOT EXISTS repair_count         integer      NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS fallback_used        boolean      NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS generation_quality   text         NOT NULL DEFAULT 'excellent';

-- Index for querying by quality and repair state
CREATE INDEX IF NOT EXISTS sw_blueprints_quality_idx      ON sonic_world_blueprints (generation_quality);
CREATE INDEX IF NOT EXISTS sw_blueprints_repair_count_idx ON sonic_world_blueprints (repair_count);

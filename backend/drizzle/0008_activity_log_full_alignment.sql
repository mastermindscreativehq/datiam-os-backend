-- Final full-alignment migration for activity_log.
-- Ensures every column in the canonical schema.ts definition exists in production,
-- regardless of which prior migrations ran on this database instance.
-- Every ALTER TABLE uses IF NOT EXISTS — fully idempotent, zero data loss.

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. Legacy columns present in the original 0003 CREATE TABLE.
--    The 0007 repair migration never re-added these, so any DB that skipped 0003
--    or had it partially applied is still missing them.
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE activity_log ADD COLUMN IF NOT EXISTS user_name   TEXT;
ALTER TABLE activity_log ADD COLUMN IF NOT EXISTS action      TEXT;
ALTER TABLE activity_log ADD COLUMN IF NOT EXISTS entity_type TEXT;
ALTER TABLE activity_log ADD COLUMN IF NOT EXISTS entity_id   TEXT;
ALTER TABLE activity_log ADD COLUMN IF NOT EXISTS entity_name TEXT;

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. v2 columns — idempotent re-statement of 0006/0007.
--    Safe to run even if already present.
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE activity_log ADD COLUMN IF NOT EXISTS user_email  TEXT;
ALTER TABLE activity_log ADD COLUMN IF NOT EXISTS event_type  TEXT;
ALTER TABLE activity_log ADD COLUMN IF NOT EXISTS module      TEXT;
ALTER TABLE activity_log ADD COLUMN IF NOT EXISTS title       TEXT;
ALTER TABLE activity_log ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE activity_log ADD COLUMN IF NOT EXISTS severity    TEXT    DEFAULT 'info';
ALTER TABLE activity_log ADD COLUMN IF NOT EXISTS metadata    JSONB   DEFAULT '{}';
ALTER TABLE activity_log ADD COLUMN IF NOT EXISTS created_at  TIMESTAMP DEFAULT NOW();

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. Backfill any pre-existing NULLs before hardening constraints.
-- ─────────────────────────────────────────────────────────────────────────────
UPDATE activity_log SET severity   = 'info'         WHERE severity   IS NULL;
UPDATE activity_log SET metadata   = '{}'::jsonb    WHERE metadata   IS NULL;
UPDATE activity_log SET event_type = 'system.event' WHERE event_type IS NULL;
UPDATE activity_log SET title      = 'Legacy Event' WHERE title      IS NULL;

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. Harden severity and metadata to NOT NULL — matches schema.ts definition.
--    Safe because backfill above eliminates all NULLs first.
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE activity_log ALTER COLUMN severity SET NOT NULL;
ALTER TABLE activity_log ALTER COLUMN metadata SET NOT NULL;

-- ─────────────────────────────────────────────────────────────────────────────
-- 5. Ensure all indexes exist (idempotent).
-- ─────────────────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS activity_log_user_id_idx     ON activity_log(user_id);
CREATE INDEX IF NOT EXISTS activity_log_action_idx      ON activity_log(action);
CREATE INDEX IF NOT EXISTS activity_log_entity_type_idx ON activity_log(entity_type);
CREATE INDEX IF NOT EXISTS activity_log_created_at_idx  ON activity_log(created_at);
CREATE INDEX IF NOT EXISTS activity_log_event_type_idx  ON activity_log(event_type);
CREATE INDEX IF NOT EXISTS activity_log_module_idx      ON activity_log(module);
CREATE INDEX IF NOT EXISTS activity_log_severity_idx    ON activity_log(severity);

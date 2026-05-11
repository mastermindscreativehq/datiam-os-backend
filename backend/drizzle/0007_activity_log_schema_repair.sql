-- Surgical production repair: add all required activity_log columns with IF NOT EXISTS.
-- Safe on any DB state — no drops, no recreates, no data loss.
-- Covers both legacy columns (0003) and v2 columns (0006) that may be missing in prod.

ALTER TABLE activity_log ADD COLUMN IF NOT EXISTS user_email TEXT;
ALTER TABLE activity_log ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW();
ALTER TABLE activity_log ADD COLUMN IF NOT EXISTS event_type TEXT;
ALTER TABLE activity_log ADD COLUMN IF NOT EXISTS module TEXT;
ALTER TABLE activity_log ADD COLUMN IF NOT EXISTS title TEXT;
ALTER TABLE activity_log ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE activity_log ADD COLUMN IF NOT EXISTS severity TEXT DEFAULT 'info';
ALTER TABLE activity_log ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;

-- Backfill NULLs on pre-existing rows
UPDATE activity_log SET severity   = 'info'         WHERE severity   IS NULL;
UPDATE activity_log SET event_type = 'system.event' WHERE event_type IS NULL;
UPDATE activity_log SET title      = 'Legacy Event' WHERE title      IS NULL;

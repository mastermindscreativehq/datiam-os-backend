-- Make legacy columns nullable so new-style logs don't require them
ALTER TABLE activity_log ALTER COLUMN user_email DROP NOT NULL;
ALTER TABLE activity_log ALTER COLUMN action DROP NOT NULL;
ALTER TABLE activity_log ALTER COLUMN entity_type DROP NOT NULL;

-- Add new columns for the v2 activity engine
ALTER TABLE activity_log ADD COLUMN IF NOT EXISTS event_type TEXT;
ALTER TABLE activity_log ADD COLUMN IF NOT EXISTS module TEXT;
ALTER TABLE activity_log ADD COLUMN IF NOT EXISTS title TEXT;
ALTER TABLE activity_log ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE activity_log ADD COLUMN IF NOT EXISTS metadata JSONB NOT NULL DEFAULT '{}';
ALTER TABLE activity_log ADD COLUMN IF NOT EXISTS severity TEXT NOT NULL DEFAULT 'info';

-- Indexes for the new columns
CREATE INDEX IF NOT EXISTS activity_log_event_type_idx ON activity_log(event_type);
CREATE INDEX IF NOT EXISTS activity_log_module_idx ON activity_log(module);
CREATE INDEX IF NOT EXISTS activity_log_severity_idx ON activity_log(severity);

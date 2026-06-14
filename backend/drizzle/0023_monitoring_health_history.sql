-- 0023_monitoring_health_history.sql
-- Watchdog engine: health check history and incident tracking

CREATE TABLE IF NOT EXISTS "health_checks" (
  "id"                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "status"             text NOT NULL DEFAULT 'healthy',
  "database_status"    text NOT NULL DEFAULT 'unknown',
  "redis_status"       text NOT NULL DEFAULT 'unknown',
  "queue_status"       text NOT NULL DEFAULT 'unknown',
  "response_time_ms"   integer,
  "details"            jsonb,
  "created_at"         timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "health_checks_created_at_idx" ON "health_checks" ("created_at");
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "incidents" (
  "id"              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "incident_key"    text NOT NULL,
  "severity"        text NOT NULL DEFAULT 'warning',
  "title"           text NOT NULL,
  "description"     text,
  "status"          text NOT NULL DEFAULT 'open',
  "started_at"      timestamp with time zone DEFAULT now() NOT NULL,
  "resolved_at"     timestamp with time zone,
  "metadata"        jsonb,
  "created_at"      timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "incidents_status_idx"     ON "incidents" ("status");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "incidents_key_status_idx" ON "incidents" ("incident_key", "status");

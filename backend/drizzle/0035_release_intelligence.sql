CREATE TYPE "release_campaign_type" AS ENUM ('marketing', 'playlist', 'blog', 'press', 'pre_save');
CREATE TYPE "release_campaign_status" AS ENUM ('planned', 'active', 'paused', 'completed', 'cancelled');
CREATE TYPE "release_dsp_platform_status" AS ENUM ('not_submitted', 'submitted', 'processing', 'live', 'rejected', 'taken_down');
CREATE TYPE "release_alert_severity" AS ENUM ('info', 'warning', 'critical');

CREATE TABLE IF NOT EXISTS "release_campaigns" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "release_id" uuid NOT NULL REFERENCES "releases"("id") ON DELETE CASCADE,
  "artist_id" uuid REFERENCES "artist_profiles"("id") ON DELETE SET NULL,
  "campaign_type" "release_campaign_type" NOT NULL,
  "title" text NOT NULL,
  "status" "release_campaign_status" NOT NULL DEFAULT 'planned',
  "target_date" date,
  "budget" numeric(12, 2),
  "currency" text DEFAULT 'USD',
  "notes" text,
  "metadata" jsonb,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "release_dsp_status" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "release_id" uuid NOT NULL REFERENCES "releases"("id") ON DELETE CASCADE,
  "platform" text NOT NULL,
  "status" "release_dsp_platform_status" NOT NULL DEFAULT 'not_submitted',
  "url" text,
  "submitted_at" timestamp with time zone,
  "live_at" timestamp with time zone,
  "notes" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  UNIQUE("release_id", "platform")
);

CREATE TABLE IF NOT EXISTS "release_alerts" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "release_id" uuid NOT NULL REFERENCES "releases"("id") ON DELETE CASCADE,
  "alert_type" text NOT NULL,
  "severity" "release_alert_severity" NOT NULL DEFAULT 'info',
  "title" text NOT NULL,
  "message" text NOT NULL,
  "is_resolved" boolean NOT NULL DEFAULT false,
  "resolved_at" timestamp with time zone,
  "metadata" jsonb,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "release_ai_recs" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "release_id" uuid NOT NULL REFERENCES "releases"("id") ON DELETE CASCADE,
  "rec_type" text NOT NULL,
  "title" text NOT NULL,
  "description" text NOT NULL,
  "priority" integer NOT NULL DEFAULT 0,
  "is_actioned" boolean NOT NULL DEFAULT false,
  "actioned_at" timestamp with time zone,
  "metadata" jsonb,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "release_campaigns_release_id_idx" ON "release_campaigns" ("release_id");
CREATE INDEX IF NOT EXISTS "release_campaigns_artist_id_idx" ON "release_campaigns" ("artist_id");
CREATE INDEX IF NOT EXISTS "release_campaigns_status_idx" ON "release_campaigns" ("status");
CREATE INDEX IF NOT EXISTS "release_dsp_status_release_id_idx" ON "release_dsp_status" ("release_id");
CREATE INDEX IF NOT EXISTS "release_alerts_release_id_idx" ON "release_alerts" ("release_id");
CREATE INDEX IF NOT EXISTS "release_alerts_severity_idx" ON "release_alerts" ("severity");
CREATE INDEX IF NOT EXISTS "release_alerts_is_resolved_idx" ON "release_alerts" ("is_resolved");
CREATE INDEX IF NOT EXISTS "release_ai_recs_release_id_idx" ON "release_ai_recs" ("release_id");

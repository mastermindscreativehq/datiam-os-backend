-- DATIAM Growth OS — Global Publishing Engine
-- Migration 0041
--
-- Purpose: Create the publishing pipeline tables.
--   - scheduled_posts: posts queued for publication with status tracking
--     and retry logic. The BullMQ publishingQueue worker reads from here.
--   - published_posts: immutable record written after a successful publish.
--     Stores the platform-assigned post ID for analytics retrieval.
--   - post_captions: AI-generated or manually authored captions keyed
--     to a content asset + platform combination.
--
-- Rollback:
--   DROP TABLE IF EXISTS post_captions;
--   DROP TABLE IF EXISTS published_posts;
--   DROP TABLE IF EXISTS scheduled_posts;
--   DROP TYPE IF EXISTS caption_source;
--   DROP TYPE IF EXISTS scheduled_post_status;

-- ── 1. Enums ───────────────────────────────────────────────────────────────
DO $$ BEGIN
  CREATE TYPE scheduled_post_status AS ENUM (
    'draft', 'scheduled', 'publishing', 'published', 'failed', 'cancelled'
  );
  EXCEPTION WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint

DO $$ BEGIN
  CREATE TYPE caption_source AS ENUM ('ai', 'manual', 'template');
  EXCEPTION WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint

-- ── 2. scheduled_posts ─────────────────────────────────────────────────────
-- One row per post queued for publication. The BullMQ publishingQueue
-- worker polls rows with status = 'scheduled' and scheduled_at <= now().
CREATE TABLE IF NOT EXISTS scheduled_posts (
  id                uuid                   PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  content_id        uuid                   REFERENCES content_ideas(id) ON DELETE SET NULL,
  social_account_id uuid                   REFERENCES social_accounts(id) ON DELETE CASCADE,
  platform_id       uuid                   NOT NULL REFERENCES platform_definitions(id) ON DELETE RESTRICT,
  campaign_id       uuid                   REFERENCES campaigns(id) ON DELETE SET NULL,
  caption           text,
  hashtags          jsonb                  NOT NULL DEFAULT '[]'::jsonb,
  cta               text,
  media_urls        jsonb                  NOT NULL DEFAULT '[]'::jsonb,
  scheduled_at      timestamptz            NOT NULL,
  status            scheduled_post_status  NOT NULL DEFAULT 'draft',
  retry_count       integer                NOT NULL DEFAULT 0,
  max_retries       integer                NOT NULL DEFAULT 3,
  last_error        text,
  metadata          jsonb                  NOT NULL DEFAULT '{}'::jsonb,
  created_by        uuid                   REFERENCES users(id) ON DELETE SET NULL,
  created_at        timestamptz            NOT NULL DEFAULT now(),
  updated_at        timestamptz            NOT NULL DEFAULT now()
);
--> statement-breakpoint

-- ── 3. published_posts ─────────────────────────────────────────────────────
-- Written once after successful publication. Treated as immutable.
-- platform_post_id is the ID returned by the target platform API.
CREATE TABLE IF NOT EXISTS published_posts (
  id                uuid        PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  scheduled_post_id uuid        REFERENCES scheduled_posts(id) ON DELETE SET NULL,
  content_id        uuid        REFERENCES content_ideas(id) ON DELETE SET NULL,
  social_account_id uuid        REFERENCES social_accounts(id) ON DELETE SET NULL,
  platform_id       uuid        NOT NULL REFERENCES platform_definitions(id) ON DELETE RESTRICT,
  campaign_id       uuid        REFERENCES campaigns(id) ON DELETE SET NULL,
  platform_post_id  text,
  platform_url      text,
  caption_used      text,
  hashtags_used     jsonb       NOT NULL DEFAULT '[]'::jsonb,
  published_at      timestamptz NOT NULL DEFAULT now(),
  raw_response      jsonb       NOT NULL DEFAULT '{}'::jsonb,
  created_at        timestamptz NOT NULL DEFAULT now()
);
--> statement-breakpoint

-- ── 4. post_captions ───────────────────────────────────────────────────────
-- Stores generated or authored captions per content asset + platform.
-- Multiple captions can exist per content+platform pair; approved = true
-- marks the one actually used for publication.
CREATE TABLE IF NOT EXISTS post_captions (
  id                uuid           PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  content_id        uuid           REFERENCES content_ideas(id) ON DELETE CASCADE,
  platform_id       uuid           NOT NULL REFERENCES platform_definitions(id) ON DELETE RESTRICT,
  caption           text           NOT NULL,
  hashtags          jsonb          NOT NULL DEFAULT '[]'::jsonb,
  cta               text,
  source            caption_source NOT NULL DEFAULT 'ai',
  model_version     text,
  generation_prompt text,
  approved          boolean        NOT NULL DEFAULT false,
  approved_by       uuid           REFERENCES users(id) ON DELETE SET NULL,
  approved_at       timestamptz,
  created_at        timestamptz    NOT NULL DEFAULT now(),
  updated_at        timestamptz    NOT NULL DEFAULT now()
);
--> statement-breakpoint

-- ── 5. Indexes ─────────────────────────────────────────────────────────────
-- scheduled_posts — worker queries by status + scheduled_at
CREATE INDEX IF NOT EXISTS scheduled_posts_content_id_idx        ON scheduled_posts(content_id);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS scheduled_posts_account_id_idx        ON scheduled_posts(social_account_id);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS scheduled_posts_platform_id_idx       ON scheduled_posts(platform_id);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS scheduled_posts_campaign_id_idx       ON scheduled_posts(campaign_id);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS scheduled_posts_status_idx            ON scheduled_posts(status);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS scheduled_posts_scheduled_at_idx      ON scheduled_posts(scheduled_at);
--> statement-breakpoint
-- Composite used by the worker: find pending posts due for execution
CREATE INDEX IF NOT EXISTS scheduled_posts_worker_idx            ON scheduled_posts(status, scheduled_at) WHERE status IN ('scheduled', 'failed');
--> statement-breakpoint

-- published_posts — analytics joins query by content, platform, campaign
CREATE INDEX IF NOT EXISTS published_posts_content_id_idx        ON published_posts(content_id);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS published_posts_account_id_idx        ON published_posts(social_account_id);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS published_posts_platform_id_idx       ON published_posts(platform_id);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS published_posts_campaign_id_idx       ON published_posts(campaign_id);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS published_posts_published_at_idx      ON published_posts(published_at DESC);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS published_posts_platform_post_id_idx  ON published_posts(platform_post_id);
--> statement-breakpoint

-- post_captions — generation lookups by content + platform
CREATE INDEX IF NOT EXISTS post_captions_content_id_idx          ON post_captions(content_id);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS post_captions_platform_id_idx         ON post_captions(platform_id);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS post_captions_content_platform_idx    ON post_captions(content_id, platform_id);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS post_captions_approved_idx            ON post_captions(content_id, platform_id, approved) WHERE approved = true;
--> statement-breakpoint

-- ── 6. Seed workflow registry ──────────────────────────────────────────────
INSERT INTO workflow_registry (name, description, event_triggers, webhook_path, is_active) VALUES
  ('content-published',  'Fires when a post is successfully published to a platform', ARRAY['content.published'],  '/webhook/content-publishing', true),
  ('post-publish-failed','Fires when a scheduled post fails after max retries',        ARRAY['post.publish.failed'],'/webhook/notification-engine', true)
ON CONFLICT (name) DO NOTHING;

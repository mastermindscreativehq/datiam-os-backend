-- DATIAM Growth OS — Content Vault
-- Migration 0038
--
-- Purpose: Extend content_ideas into the full Content Vault.
--   - Adds 18 new content types to the content_type enum.
--   - Adds 22 new columns to content_ideas (all nullable / with defaults).
--   - Creates content_versions (snapshot history).
--   - Creates content_tags and content_tag_map (tagging system).
--
-- Backward compatible: every new column is nullable or has a safe default.
-- Existing rows are untouched; all new FK columns default to NULL.
--
-- Rollback:
--   ALTER TABLE content_ideas
--     DROP COLUMN IF EXISTS title,
--     DROP COLUMN IF EXISTS description,
--     DROP COLUMN IF EXISTS artist_id,
--     DROP COLUMN IF EXISTS release_id,
--     DROP COLUMN IF EXISTS language,
--     DROP COLUMN IF EXISTS country_targets,
--     DROP COLUMN IF EXISTS mood,
--     DROP COLUMN IF EXISTS genre,
--     DROP COLUMN IF EXISTS bpm,
--     DROP COLUMN IF EXISTS musical_key,
--     DROP COLUMN IF EXISTS cta,
--     DROP COLUMN IF EXISTS hashtags,
--     DROP COLUMN IF EXISTS thumbnail_url,
--     DROP COLUMN IF EXISTS asset_url,
--     DROP COLUMN IF EXISTS video_duration_seconds,
--     DROP COLUMN IF EXISTS performance_score,
--     DROP COLUMN IF EXISTS last_published_at,
--     DROP COLUMN IF EXISTS publish_count,
--     DROP COLUMN IF EXISTS best_platform,
--     DROP COLUMN IF EXISTS best_country,
--     DROP COLUMN IF EXISTS ai_notes,
--     DROP COLUMN IF EXISTS tags,
--     DROP COLUMN IF EXISTS platform_targets,
--     DROP COLUMN IF EXISTS updated_at;
--   DROP TABLE IF EXISTS content_tag_map;
--   DROP TABLE IF EXISTS content_tags;
--   DROP TABLE IF EXISTS content_versions;
--   (Enum values cannot be removed without first deleting all rows using them.)

-- ── 1. Extend content_type enum with 18 new content formats ────────────────
-- Note: ALTER TYPE ADD VALUE is non-transactional in PostgreSQL.
-- Each statement commits immediately and cannot be rolled back in a
-- transaction block. Run outside an explicit transaction if needed.

ALTER TYPE content_type ADD VALUE IF NOT EXISTS 'story';
--> statement-breakpoint
ALTER TYPE content_type ADD VALUE IF NOT EXISTS 'carousel';
--> statement-breakpoint
ALTER TYPE content_type ADD VALUE IF NOT EXISTS 'photo';
--> statement-breakpoint
ALTER TYPE content_type ADD VALUE IF NOT EXISTS 'lyric_video';
--> statement-breakpoint
ALTER TYPE content_type ADD VALUE IF NOT EXISTS 'visualizer';
--> statement-breakpoint
ALTER TYPE content_type ADD VALUE IF NOT EXISTS 'behind_the_scenes';
--> statement-breakpoint
ALTER TYPE content_type ADD VALUE IF NOT EXISTS 'studio_session';
--> statement-breakpoint
ALTER TYPE content_type ADD VALUE IF NOT EXISTS 'quote';
--> statement-breakpoint
ALTER TYPE content_type ADD VALUE IF NOT EXISTS 'meme';
--> statement-breakpoint
ALTER TYPE content_type ADD VALUE IF NOT EXISTS 'fan_question';
--> statement-breakpoint
ALTER TYPE content_type ADD VALUE IF NOT EXISTS 'dance_prompt';
--> statement-breakpoint
ALTER TYPE content_type ADD VALUE IF NOT EXISTS 'instrumental_clip';
--> statement-breakpoint
ALTER TYPE content_type ADD VALUE IF NOT EXISTS 'acapella';
--> statement-breakpoint
ALTER TYPE content_type ADD VALUE IF NOT EXISTS 'countdown';
--> statement-breakpoint
ALTER TYPE content_type ADD VALUE IF NOT EXISTS 'cover_reveal';
--> statement-breakpoint
ALTER TYPE content_type ADD VALUE IF NOT EXISTS 'wallpaper';
--> statement-breakpoint
ALTER TYPE content_type ADD VALUE IF NOT EXISTS 'blog';
--> statement-breakpoint
ALTER TYPE content_type ADD VALUE IF NOT EXISTS 'newsletter';
--> statement-breakpoint

-- ── 2. Add vault columns to content_ideas ─────────────────────────────────

ALTER TABLE content_ideas ADD COLUMN IF NOT EXISTS title               text;
--> statement-breakpoint
ALTER TABLE content_ideas ADD COLUMN IF NOT EXISTS description         text;
--> statement-breakpoint
ALTER TABLE content_ideas ADD COLUMN IF NOT EXISTS artist_id           uuid REFERENCES artist_profiles(id) ON DELETE SET NULL;
--> statement-breakpoint
ALTER TABLE content_ideas ADD COLUMN IF NOT EXISTS release_id          uuid REFERENCES releases(id) ON DELETE SET NULL;
--> statement-breakpoint
-- campaign_id FK added in 0039 after campaigns table is created.

ALTER TABLE content_ideas ADD COLUMN IF NOT EXISTS language            text DEFAULT 'en';
--> statement-breakpoint
ALTER TABLE content_ideas ADD COLUMN IF NOT EXISTS country_targets     jsonb DEFAULT '[]'::jsonb;
--> statement-breakpoint
ALTER TABLE content_ideas ADD COLUMN IF NOT EXISTS platform_targets    jsonb DEFAULT '[]'::jsonb;
--> statement-breakpoint
ALTER TABLE content_ideas ADD COLUMN IF NOT EXISTS mood                text;
--> statement-breakpoint
ALTER TABLE content_ideas ADD COLUMN IF NOT EXISTS genre               text;
--> statement-breakpoint
ALTER TABLE content_ideas ADD COLUMN IF NOT EXISTS bpm                 integer;
--> statement-breakpoint
ALTER TABLE content_ideas ADD COLUMN IF NOT EXISTS musical_key         text;
--> statement-breakpoint
ALTER TABLE content_ideas ADD COLUMN IF NOT EXISTS cta                 text;
--> statement-breakpoint
ALTER TABLE content_ideas ADD COLUMN IF NOT EXISTS hashtags            jsonb DEFAULT '[]'::jsonb;
--> statement-breakpoint
ALTER TABLE content_ideas ADD COLUMN IF NOT EXISTS thumbnail_url       text;
--> statement-breakpoint
ALTER TABLE content_ideas ADD COLUMN IF NOT EXISTS asset_url           text;
--> statement-breakpoint
ALTER TABLE content_ideas ADD COLUMN IF NOT EXISTS video_duration_seconds integer;
--> statement-breakpoint
ALTER TABLE content_ideas ADD COLUMN IF NOT EXISTS performance_score   numeric(5,2) NOT NULL DEFAULT 0;
--> statement-breakpoint
ALTER TABLE content_ideas ADD COLUMN IF NOT EXISTS last_published_at   timestamptz;
--> statement-breakpoint
ALTER TABLE content_ideas ADD COLUMN IF NOT EXISTS publish_count       integer NOT NULL DEFAULT 0;
--> statement-breakpoint
ALTER TABLE content_ideas ADD COLUMN IF NOT EXISTS best_platform       text;
--> statement-breakpoint
ALTER TABLE content_ideas ADD COLUMN IF NOT EXISTS best_country        text;
--> statement-breakpoint
ALTER TABLE content_ideas ADD COLUMN IF NOT EXISTS ai_notes            text;
--> statement-breakpoint
ALTER TABLE content_ideas ADD COLUMN IF NOT EXISTS tags                jsonb DEFAULT '[]'::jsonb;
--> statement-breakpoint
ALTER TABLE content_ideas ADD COLUMN IF NOT EXISTS updated_at          timestamptz NOT NULL DEFAULT now();
--> statement-breakpoint

-- ── 3. content_versions — snapshot history per content asset ───────────────
CREATE TABLE IF NOT EXISTS content_versions (
  id             uuid        PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  content_id     uuid        NOT NULL REFERENCES content_ideas(id) ON DELETE CASCADE,
  version_number integer     NOT NULL DEFAULT 1,
  snapshot       jsonb       NOT NULL DEFAULT '{}'::jsonb,
  change_note    text,
  created_by     uuid        REFERENCES users(id) ON DELETE SET NULL,
  created_at     timestamptz NOT NULL DEFAULT now()
);
--> statement-breakpoint

-- ── 4. content_tags — reusable tag registry ────────────────────────────────
CREATE TABLE IF NOT EXISTS content_tags (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  name       text        NOT NULL,
  slug       text        NOT NULL UNIQUE,
  color      text        NOT NULL DEFAULT '#6366f1',
  created_at timestamptz NOT NULL DEFAULT now()
);
--> statement-breakpoint

-- ── 5. content_tag_map — many-to-many content ↔ tags ──────────────────────
CREATE TABLE IF NOT EXISTS content_tag_map (
  content_id uuid        NOT NULL REFERENCES content_ideas(id) ON DELETE CASCADE,
  tag_id     uuid        NOT NULL REFERENCES content_tags(id) ON DELETE CASCADE,
  added_at   timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (content_id, tag_id)
);
--> statement-breakpoint

-- ── 6. Indexes ─────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS content_ideas_artist_id_idx        ON content_ideas(artist_id);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS content_ideas_release_id_idx       ON content_ideas(release_id);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS content_ideas_status_idx           ON content_ideas(status);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS content_ideas_type_idx             ON content_ideas(content_type);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS content_ideas_performance_idx      ON content_ideas(performance_score DESC);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS content_ideas_last_published_idx   ON content_ideas(last_published_at DESC);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS content_ideas_mood_idx             ON content_ideas(mood);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS content_versions_content_id_idx    ON content_versions(content_id);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS content_versions_number_idx        ON content_versions(content_id, version_number);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS content_tag_map_tag_id_idx         ON content_tag_map(tag_id);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS content_tags_slug_idx              ON content_tags(slug);

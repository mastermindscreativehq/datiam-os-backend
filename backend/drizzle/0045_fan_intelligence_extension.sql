-- DATIAM Growth OS — Fan Intelligence Extension
-- Migration 0045
--
-- Purpose: Extend fan_profiles and fan_event_type to support
--   ambassador identification and richer interaction tracking.
--   - Adds ambassador_score, dsp_listener_count, referral_count,
--     community_score to fan_profiles.
--   - Adds 4 new event types to fan_event_type enum.
--
-- Backward compatible: all new columns have NOT NULL DEFAULT 0.
-- Existing fan score logic (recalculateFanScore) is unaffected —
-- the new event types simply add weight when present.
--
-- Rollback:
--   ALTER TABLE fan_profiles
--     DROP COLUMN IF EXISTS ambassador_score,
--     DROP COLUMN IF EXISTS dsp_listener_count,
--     DROP COLUMN IF EXISTS referral_count,
--     DROP COLUMN IF EXISTS community_score;
--   (fan_event_type enum values cannot be removed without deleting rows.)

-- ── 1. Extend fan_profiles ─────────────────────────────────────────────────
ALTER TABLE fan_profiles ADD COLUMN IF NOT EXISTS ambassador_score   numeric(5,2) NOT NULL DEFAULT 0;
--> statement-breakpoint
ALTER TABLE fan_profiles ADD COLUMN IF NOT EXISTS dsp_listener_count bigint       NOT NULL DEFAULT 0;
--> statement-breakpoint
-- referral_count: number of other fans this fan has referred
ALTER TABLE fan_profiles ADD COLUMN IF NOT EXISTS referral_count     integer      NOT NULL DEFAULT 0;
--> statement-breakpoint
-- community_score: composite of comments + shares + community events
ALTER TABLE fan_profiles ADD COLUMN IF NOT EXISTS community_score    numeric(5,2) NOT NULL DEFAULT 0;
--> statement-breakpoint

-- ── 2. Extend fan_event_type enum ─────────────────────────────────────────
-- content_viewed: fan viewed a content vault asset (video, post, etc.)
ALTER TYPE fan_event_type ADD VALUE IF NOT EXISTS 'content_viewed';
--> statement-breakpoint
-- link_referral: fan's referral link led to another fan joining
ALTER TYPE fan_event_type ADD VALUE IF NOT EXISTS 'link_referral';
--> statement-breakpoint
-- playlist_saved: fan saved a Spotify / Apple Music playlist
ALTER TYPE fan_event_type ADD VALUE IF NOT EXISTS 'playlist_saved';
--> statement-breakpoint
-- merch_purchased: fan bought merchandise
ALTER TYPE fan_event_type ADD VALUE IF NOT EXISTS 'merch_purchased';
--> statement-breakpoint

-- ── 3. Indexes ─────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS fan_profiles_ambassador_score_idx    ON fan_profiles(ambassador_score DESC);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS fan_profiles_dsp_listener_count_idx  ON fan_profiles(dsp_listener_count DESC);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS fan_profiles_referral_count_idx      ON fan_profiles(referral_count DESC);
--> statement-breakpoint
-- Partial index — quickly locate ambassador candidates
CREATE INDEX IF NOT EXISTS fan_profiles_ambassador_candidates_idx ON fan_profiles(ambassador_score DESC)
  WHERE ambassador_score > 0;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS fan_events_event_type_idx            ON fan_events(event_type);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS fan_events_created_at_idx            ON fan_events(created_at DESC);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS fan_events_fan_type_idx              ON fan_events(fan_id, event_type);

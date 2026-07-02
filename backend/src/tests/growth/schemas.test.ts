/**
 * Growth OS — Zod schema unit tests.
 * Pure validation — no app import, no DB, no network.
 */
import { describe, it, expect } from 'vitest';

// ── Content Vault ─────────────────────────────────────────────────────────────
import {
  createContentSchema,
  updateContentSchema,
} from '../../modules/content/content-vault.schema';

describe('content-vault schemas', () => {
  it('accepts valid create payload', () => {
    const result = createContentSchema.safeParse({
      content_type: 'reel',
      title: 'My reel',
      platform: 'instagram',
    });
    expect(result.success).toBe(true);
  });

  it('rejects missing content_type', () => {
    const result = createContentSchema.safeParse({ title: 'oops' });
    expect(result.success).toBe(false);
  });

  it('accepts partial update', () => {
    const result = updateContentSchema.safeParse({ status: 'scripted' });
    expect(result.success).toBe(true);
  });
});

// ── Campaign Manager ──────────────────────────────────────────────────────────
import {
  createCampaignSchema,
  updateCampaignSchema,
} from '../../modules/campaign-manager/campaign-manager.schema';

describe('campaign-manager schemas', () => {
  it('accepts valid campaign', () => {
    const result = createCampaignSchema.safeParse({
      name: 'Summer Release',
      campaign_type: 'release',
      artist_id: '00000000-0000-0000-0000-000000000001',
    });
    expect(result.success).toBe(true);
  });

  it('rejects invalid campaign_type', () => {
    const result = createCampaignSchema.safeParse({
      name: 'X',
      campaign_type: 'not_a_type',
      artist_id: '00000000-0000-0000-0000-000000000001',
    });
    expect(result.success).toBe(false);
  });

  it('accepts empty update', () => {
    const result = updateCampaignSchema.safeParse({});
    expect(result.success).toBe(true);
  });
});

// ── Social Accounts ───────────────────────────────────────────────────────────
import {
  createSocialAccountSchema,
} from '../../modules/social-accounts/social-accounts.schema';

describe('social-accounts schemas', () => {
  it('accepts valid account', () => {
    const result = createSocialAccountSchema.safeParse({
      artist_id:   '00000000-0000-0000-0000-000000000001',
      platform_id: '00000000-0000-0000-0000-000000000002',
      username:    '@testartist',
    });
    expect(result.success).toBe(true);
  });

  it('rejects non-uuid platform_id', () => {
    const result = createSocialAccountSchema.safeParse({
      artist_id:   '00000000-0000-0000-0000-000000000001',
      platform_id: 'not-a-uuid',
      username:    '@x',
    });
    expect(result.success).toBe(false);
  });

  it('rejects missing username', () => {
    const result = createSocialAccountSchema.safeParse({
      artist_id:   '00000000-0000-0000-0000-000000000001',
      platform_id: '00000000-0000-0000-0000-000000000002',
    });
    expect(result.success).toBe(false);
  });
});

// ── Publishing Engine ─────────────────────────────────────────────────────────
import {
  schedulePostSchema,
} from '../../modules/publishing-engine/publishing-engine.schema';

describe('publishing-engine schemas', () => {
  it('accepts valid schedule payload', () => {
    const result = schedulePostSchema.safeParse({
      social_account_id: '00000000-0000-0000-0000-000000000001',
      scheduled_for: '2026-08-01T10:00:00.000Z',
    });
    expect(result.success).toBe(true);
  });

  it('rejects missing scheduled_for', () => {
    const result = schedulePostSchema.safeParse({
      social_account_id: '00000000-0000-0000-0000-000000000001',
    });
    expect(result.success).toBe(false);
  });
});

// ── Trend Intelligence ────────────────────────────────────────────────────────
import {
  createTrendSchema,
} from '../../modules/trend-intelligence/trend-intelligence.schema';

describe('trend-intelligence schemas', () => {
  it('accepts valid trend', () => {
    const result = createTrendSchema.safeParse({
      title:        '#AfrobeatsDance',
      category:     'dance',
      trend_score:  85,
      platform_id:  '00000000-0000-0000-0000-000000000001',
    });
    expect(result.success).toBe(true);
  });

  it('rejects trend_score out of range', () => {
    const result = createTrendSchema.safeParse({
      title: 'X', category: 'dance', trend_score: 150,
      platform_id: '00000000-0000-0000-0000-000000000001',
    });
    expect(result.success).toBe(false);
  });
});

// ── Notifications ─────────────────────────────────────────────────────────────
import {
  notificationFilterSchema,
} from '../../modules/notifications/notifications.schema';

describe('notifications schemas', () => {
  it('filter schema accepts empty object', () => {
    const result = notificationFilterSchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it('filter schema coerces string booleans and numbers', () => {
    const result = notificationFilterSchema.safeParse({ unread_only: 'true', limit: '20' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.unread_only).toBe(true);
      expect(result.data.limit).toBe(20);
    }
  });

  it('filter schema rejects limit > 100', () => {
    const result = notificationFilterSchema.safeParse({ limit: '200' });
    expect(result.success).toBe(false);
  });
});

// ── Growth AI ─────────────────────────────────────────────────────────────────
import {
  generateCaptionSchema,
  generateHashtagsSchema,
  generateCtaSchema,
  generateContentCalendarSchema,
  enrichContentIdeaSchema,
  scoreContentBriefSchema,
} from '../../modules/ai/growth-ai.schema';

describe('growth-ai schemas', () => {
  it('generateCaptionSchema requires uuid content_id', () => {
    const ok = generateCaptionSchema.safeParse({
      content_id: '00000000-0000-0000-0000-000000000001',
      platform_slug: 'instagram',
    });
    expect(ok.success).toBe(true);

    const fail = generateCaptionSchema.safeParse({
      content_id: 'not-uuid',
      platform_slug: 'instagram',
    });
    expect(fail.success).toBe(false);
  });

  it('generateHashtagsSchema requires platform_slug', () => {
    const fail = generateHashtagsSchema.safeParse({
      content_id: '00000000-0000-0000-0000-000000000001',
    });
    expect(fail.success).toBe(false);
  });

  it('generateCtaSchema requires goal', () => {
    const fail = generateCtaSchema.safeParse({
      content_id: '00000000-0000-0000-0000-000000000001',
      platform_slug: 'tiktok',
    });
    expect(fail.success).toBe(false);
  });

  it('generateContentCalendarSchema enforces days range', () => {
    const tooFew = generateContentCalendarSchema.safeParse({
      artist_id: '00000000-0000-0000-0000-000000000001',
      start_date: '2026-08-01',
      days: 3,
      platforms: ['instagram'],
    });
    expect(tooFew.success).toBe(false);

    const tooMany = generateContentCalendarSchema.safeParse({
      artist_id: '00000000-0000-0000-0000-000000000001',
      start_date: '2026-08-01',
      days: 90,
      platforms: ['instagram'],
    });
    expect(tooMany.success).toBe(false);

    const ok = generateContentCalendarSchema.safeParse({
      artist_id: '00000000-0000-0000-0000-000000000001',
      start_date: '2026-08-01',
      days: 14,
      platforms: ['instagram', 'tiktok'],
    });
    expect(ok.success).toBe(true);
  });

  it('enrichContentIdeaSchema requires both fields', () => {
    const ok = enrichContentIdeaSchema.safeParse({
      content_id: '00000000-0000-0000-0000-000000000001',
      platform_slug: 'instagram',
    });
    expect(ok.success).toBe(true);

    const fail = enrichContentIdeaSchema.safeParse({ content_id: '00000000-0000-0000-0000-000000000001' });
    expect(fail.success).toBe(false);
  });

  it('scoreContentBriefSchema requires uuid', () => {
    const ok = scoreContentBriefSchema.safeParse({ content_id: '00000000-0000-0000-0000-000000000001' });
    expect(ok.success).toBe(true);
  });
});

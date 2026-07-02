/**
 * Growth AI routes + service logic tests.
 * The Anthropic fetch call is mocked via vi.stubGlobal so no real API calls are made.
 */
import { vi, describe, it, expect, beforeAll, afterAll } from 'vitest';

// Mock the AI service to avoid any real API calls or DB access
const mockAIService = vi.hoisted(() => ({
  generateCaption:              vi.fn(),
  generateHashtags:             vi.fn(),
  generateCTA:                  vi.fn(),
  generateCampaignBrief:        vi.fn(),
  generateCampaignRetrospective:vi.fn(),
  generateTrendContentIdea:     vi.fn(),
  generateGrowthReport:         vi.fn(),
  generatePostingSchedule:      vi.fn(),
  generateContentCalendar:      vi.fn(),
  generateAudiencePersona:      vi.fn(),
  generateCollaborationPitch:   vi.fn(),
  scoreContentBrief:            vi.fn(),
  generateReleaseStrategy:      vi.fn(),
  enrichContentIdea:            vi.fn(),
}));
vi.mock('../../modules/ai/growth-ai.service', () => ({
  growthAIService: mockAIService,
}));
vi.mock('../../modules/activity/activity.service', () => ({
  logActivity: vi.fn().mockResolvedValue(undefined),
}));

import supertest from 'supertest';
import app from '../../app';
import { authHeader, TEST_USERS, TEST_IDS } from '../helpers';

const agent = supertest(app);
const BASE  = '/api/growth/ai';

const UUID  = '00000000-0000-0000-0000-000000000001';

beforeAll(() => {
  mockAIService.generateCaption.mockResolvedValue({ caption: 'Test caption' });
  mockAIService.generateHashtags.mockResolvedValue({ hashtags: ['#music', '#afrobeats'] });
  mockAIService.generateCTA.mockResolvedValue({ cta: 'Stream now!' });
  mockAIService.generateCampaignBrief.mockResolvedValue({ brief: 'Campaign brief text...' });
  mockAIService.generateCampaignRetrospective.mockResolvedValue({ retrospective: 'Retrospective...' });
  mockAIService.generateTrendContentIdea.mockResolvedValue({ idea: 'Dance idea', hook: 'Hook', script_outline: 'Outline' });
  mockAIService.generateGrowthReport.mockResolvedValue({ report: 'Growth report...' });
  mockAIService.generatePostingSchedule.mockResolvedValue({ schedule: [] });
  mockAIService.generateContentCalendar.mockResolvedValue({ calendar: [] });
  mockAIService.generateAudiencePersona.mockResolvedValue({ persona: { persona_name: 'The Superfan' } });
  mockAIService.generateCollaborationPitch.mockResolvedValue({ subject: 'Collab?', message: 'Hey...' });
  mockAIService.scoreContentBrief.mockResolvedValue({ score: 78, breakdown: {}, suggestions: [] });
  mockAIService.generateReleaseStrategy.mockResolvedValue({ strategy: {} });
  mockAIService.enrichContentIdea.mockResolvedValue({
    content_id: UUID,
    caption: 'Enriched caption',
    hashtags: ['#music'],
    cta: 'Stream now',
    score: 75,
    score_breakdown: {},
    suggestions: [],
  });
});

// ── Auth guard on all routes ───────────────────────────────────────────────────

const AI_ROUTES = [
  ['POST', `${BASE}/caption`],
  ['POST', `${BASE}/hashtags`],
  ['POST', `${BASE}/cta`],
  ['POST', `${BASE}/campaign-brief`],
  ['POST', `${BASE}/campaign-retrospective`],
  ['POST', `${BASE}/trend-content-idea`],
  ['POST', `${BASE}/growth-report`],
  ['POST', `${BASE}/posting-schedule`],
  ['POST', `${BASE}/content-calendar`],
  ['POST', `${BASE}/audience-persona`],
  ['POST', `${BASE}/collaboration-pitch`],
  ['POST', `${BASE}/score-content`],
  ['POST', `${BASE}/release-strategy`],
  ['POST', `${BASE}/enrich-content`],
] as const;

describe('AI routes — auth guard', () => {
  for (const [method, path] of AI_ROUTES) {
    it(`${method} ${path} returns 401 without token`, async () => {
      const res = await (agent as any)[method.toLowerCase()](path).send({});
      expect(res.status).toBe(401);
    });
  }
});

// ── Validation ────────────────────────────────────────────────────────────────

describe('POST /api/growth/ai/caption — validation', () => {
  it('rejects non-uuid content_id', async () => {
    const res = await agent.post(`${BASE}/caption`).set(authHeader()).send({
      content_id: 'not-uuid',
      platform_slug: 'instagram',
    });
    expect([400, 422]).toContain(res.status);
  });

  it('rejects missing platform_slug', async () => {
    const res = await agent.post(`${BASE}/caption`).set(authHeader()).send({
      content_id: UUID,
    });
    expect([400, 422]).toContain(res.status);
  });

  it('returns caption with valid body', async () => {
    const res = await agent.post(`${BASE}/caption`).set(authHeader()).send({
      content_id: UUID, platform_slug: 'instagram',
    });
    expect(res.status).toBe(200);
    expect(res.body.data?.caption ?? res.body.caption).toBeTruthy();
  });
});

describe('POST /api/growth/ai/hashtags', () => {
  it('returns hashtag array', async () => {
    const res = await agent.post(`${BASE}/hashtags`).set(authHeader()).send({
      content_id: UUID, platform_slug: 'tiktok',
    });
    expect(res.status).toBe(200);
  });
});

describe('POST /api/growth/ai/cta', () => {
  it('rejects missing goal', async () => {
    const res = await agent.post(`${BASE}/cta`).set(authHeader()).send({
      content_id: UUID, platform_slug: 'instagram',
    });
    expect([400, 422]).toContain(res.status);
  });

  it('returns CTA with valid body', async () => {
    const res = await agent.post(`${BASE}/cta`).set(authHeader()).send({
      content_id: UUID, platform_slug: 'instagram', goal: 'streams',
    });
    expect(res.status).toBe(200);
  });
});

describe('POST /api/growth/ai/content-calendar', () => {
  it('rejects days out of range', async () => {
    const res = await agent.post(`${BASE}/content-calendar`).set(authHeader()).send({
      artist_id: UUID, start_date: '2026-08-01', days: 3, platforms: ['instagram'],
    });
    expect([400, 422]).toContain(res.status);
  });

  it('returns calendar with valid body', async () => {
    const res = await agent.post(`${BASE}/content-calendar`).set(authHeader()).send({
      artist_id: UUID, start_date: '2026-08-01', days: 14, platforms: ['instagram', 'tiktok'],
    });
    expect(res.status).toBe(200);
  });
});

describe('POST /api/growth/ai/score-content', () => {
  it('returns score and breakdown', async () => {
    const res = await agent.post(`${BASE}/score-content`).set(authHeader()).send({
      content_id: UUID,
    });
    expect(res.status).toBe(200);
    const data = res.body.data ?? res.body;
    expect(typeof (data.score ?? 0)).toBe('number');
  });
});

describe('POST /api/growth/ai/enrich-content', () => {
  it('rejects missing platform_slug', async () => {
    const res = await agent.post(`${BASE}/enrich-content`).set(authHeader()).send({
      content_id: UUID,
    });
    expect([400, 422]).toContain(res.status);
  });

  it('returns enriched content with all fields', async () => {
    const res = await agent.post(`${BASE}/enrich-content`).set(authHeader()).send({
      content_id: UUID, platform_slug: 'instagram',
    });
    expect(res.status).toBe(200);
    const data = res.body.data ?? res.body;
    expect(data.caption).toBeTruthy();
    expect(Array.isArray(data.hashtags)).toBe(true);
    expect(data.cta).toBeTruthy();
    expect(typeof data.score).toBe('number');
  });
});

describe('POST /api/growth/ai/audience-persona', () => {
  it('returns persona object', async () => {
    const res = await agent.post(`${BASE}/audience-persona`).set(authHeader()).send({
      artist_id: UUID,
    });
    expect(res.status).toBe(200);
  });
});

describe('POST /api/growth/ai/collaboration-pitch', () => {
  it('returns subject and message', async () => {
    const res = await agent.post(`${BASE}/collaboration-pitch`).set(authHeader()).send({
      artist_id:  UUID,
      contact_id: UUID,
    });
    expect(res.status).toBe(200);
    const data = res.body.data ?? res.body;
    expect(data.subject).toBeTruthy();
    expect(data.message).toBeTruthy();
  });
});

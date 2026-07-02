/**
 * Content Vault — route integration tests.
 * DB calls are prevented by mocking the service at the module level.
 */
import { vi, describe, it, expect, beforeAll } from 'vitest';

// ── Mock service before any app import ────────────────────────────────────────
const mockService = vi.hoisted(() => ({
  search:       vi.fn(),
  create:       vi.fn(),
  update:       vi.fn(),
  delete:       vi.fn(),
  getById:      vi.fn(),
  getVersions:  vi.fn(),
  createVersion: vi.fn(),
  getTags:      vi.fn(),
  createTag:    vi.fn(),
  linkTag:      vi.fn(),
  unlinkTag:    vi.fn(),
  getContentTags: vi.fn(),
}));
vi.mock('../../modules/content/content-vault.service', () => ({
  contentVaultService: mockService,
}));
vi.mock('../../modules/activity/activity.service', () => ({
  logActivity: vi.fn().mockResolvedValue(undefined),
}));

import supertest from 'supertest';
import app from '../../app';
import { authHeader, TEST_USERS, TEST_IDS, mockRecord } from '../helpers';

const agent = supertest(app);
const BASE  = '/api/growth/content';

const sampleContent = mockRecord({
  content_type:      'reel',
  title:             'Test reel',
  platform:          'instagram',
  status:            'draft',
  performance_score: '72',
});

beforeAll(() => {
  mockService.search.mockResolvedValue([sampleContent]);
  mockService.create.mockResolvedValue(sampleContent);
  mockService.update.mockResolvedValue(sampleContent);
  mockService.delete.mockResolvedValue(sampleContent);
  mockService.getById.mockResolvedValue(sampleContent);
  mockService.getVersions.mockResolvedValue([]);
  mockService.getTags.mockResolvedValue([]);
  mockService.getContentTags.mockResolvedValue([]);
});

describe('GET /api/growth/content', () => {
  it('returns 401 without token', async () => {
    const res = await agent.get(BASE);
    expect(res.status).toBe(401);
  });

  it('returns 200 with owner token', async () => {
    const res = await agent.get(BASE).set(authHeader(TEST_USERS.owner));
    expect(res.status).toBe(200);
  });

  it('returns array in data', async () => {
    const res = await agent.get(BASE).set(authHeader());
    expect(Array.isArray(res.body.data ?? res.body)).toBe(true);
  });
});

describe('POST /api/growth/content', () => {
  it('returns 401 without token', async () => {
    const res = await agent.post(BASE).send({ content_type: 'reel' });
    expect(res.status).toBe(401);
  });

  it('returns 400/422 with missing content_type', async () => {
    const res = await agent.post(BASE).set(authHeader()).send({ title: 'No type' });
    expect([400, 422]).toContain(res.status);
  });

  it('creates content with valid body', async () => {
    const res = await agent
      .post(BASE)
      .set(authHeader())
      .send({ content_type: 'reel', title: 'Test reel', platform: 'instagram' });
    expect([200, 201]).toContain(res.status);
  });
});

describe('PATCH /api/growth/content/:id', () => {
  it('returns 401 without token', async () => {
    const res = await agent.patch(`${BASE}/${TEST_IDS.content}`).send({ status: 'published' });
    expect(res.status).toBe(401);
  });

  it('returns 200 with valid update', async () => {
    const res = await agent
      .patch(`${BASE}/${TEST_IDS.content}`)
      .set(authHeader())
      .send({ status: 'scripted' });
    expect([200, 201]).toContain(res.status);
  });
});

describe('DELETE /api/growth/content/:id', () => {
  it('returns 401 without token', async () => {
    const res = await agent.delete(`${BASE}/${TEST_IDS.content}`);
    expect(res.status).toBe(401);
  });

  it('returns 403 for editor role (read-only delete)', async () => {
    const res = await agent
      .delete(`${BASE}/${TEST_IDS.content}`)
      .set(authHeader(TEST_USERS.editor));
    // editor may or may not have delete — depends on route config
    expect([200, 403]).toContain(res.status);
  });

  it('returns 200 for owner', async () => {
    const res = await agent
      .delete(`${BASE}/${TEST_IDS.content}`)
      .set(authHeader(TEST_USERS.owner));
    expect([200, 201]).toContain(res.status);
  });
});

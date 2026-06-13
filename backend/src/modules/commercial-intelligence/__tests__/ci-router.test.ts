import { describe, it, expect, vi, beforeEach } from 'vitest';
import express from 'express';
import request from 'supertest';

// ── Hoisted mock handles ───────────────────────────────────────────────────────
const mockDbLimit = vi.hoisted(() => vi.fn().mockResolvedValue([]));
const mockDbChain = vi.hoisted(() => ({
  from:    vi.fn(),
  where:   vi.fn(),
  orderBy: vi.fn(),
  limit:   mockDbLimit,
}));

const mockGetReport = vi.hoisted(() =>
  vi.fn().mockResolvedValue({ uploadId: 'u1', fileName: 'track.mp3', overallSyncScore: 65 }),
);
const mockGetArtistReports = vi.hoisted(() =>
  vi.fn().mockResolvedValue([{ uploadId: 'u1', fileName: 'track.mp3', overallSyncScore: 65 }]),
);
const mockAudit = vi.hoisted(() => vi.fn());

// ── Module mocks ───────────────────────────────────────────────────────────────

vi.mock('../../../db', () => ({
  db: { select: vi.fn().mockReturnValue(mockDbChain) },
}));

vi.mock('../../../db/schema', () => ({
  audio_uploads:    { id: 'id', artist_id: 'artist_id', file_name: 'file_name' },
  artist_profiles:  { id: 'id' },
}));

vi.mock('../../../middleware/auth', () => ({
  authenticate: (req: any, res: any, next: any) => {
    if (req.headers['x-no-auth']) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    req.user = {
      id:    'user-1',
      email: 'test@datiam.com',
      role:  req.headers['x-test-role'] ?? 'owner',
    };
    next();
  },
  requireRole: (...roles: string[]) => (req: any, res: any, next: any) => {
    if (!req.user || !roles.includes(req.user.role)) {
      res.status(403).json({ error: 'Forbidden' });
      return;
    }
    next();
  },
}));

vi.mock('../ci-audit.middleware', () => ({
  auditCiAccess: mockAudit,
}));

vi.mock('../commercial-intelligence.service', () => ({
  getCommercialIntelligenceReport: mockGetReport,
  getArtistCommercialReports:      mockGetArtistReports,
}));

vi.mock('../../../middleware/errorHandler', async () => {
  const actual = await vi.importActual<any>('../../../middleware/errorHandler');
  return actual;
});

vi.mock('../../../lib/activityLogger', () => ({
  logActivity: vi.fn(),
}));

// ── Build the Express test app ─────────────────────────────────────────────────
import ciRouter from '../commercial-intelligence.router';

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/commercial-intelligence', ciRouter);
  // Simple error handler to render AppError responses
  app.use((err: any, _req: any, res: any, _next: any) => {
    const status = err.statusCode ?? err.status ?? 500;
    res.status(status).json({ success: false, error: err.message ?? 'Internal Error' });
  });
  return app;
}

const app = buildApp();
const UPLOAD_ID  = '11111111-1111-1111-1111-111111111111';
const ARTIST_ID  = '22222222-2222-2222-2222-222222222222';

// ─────────────────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();
  mockDbChain.from.mockReturnValue(mockDbChain);
  mockDbChain.where.mockReturnValue(mockDbChain);
  mockDbChain.orderBy.mockReturnValue(mockDbChain);
  mockDbLimit.mockResolvedValue([]);
  mockGetReport.mockResolvedValue({ uploadId: UPLOAD_ID, fileName: 'track.mp3', overallSyncScore: 65 });
  mockGetArtistReports.mockResolvedValue([{ uploadId: UPLOAD_ID, fileName: 'track.mp3', overallSyncScore: 65 }]);
});

// ─────────────────────────────────────────────────────────────────────────────

describe('GET /api/commercial-intelligence/:upload_id', () => {

  describe('authentication', () => {
    it('returns 401 when no token is provided', async () => {
      const res = await request(app)
        .get(`/api/commercial-intelligence/${UPLOAD_ID}`)
        .set('x-no-auth', 'true');
      expect(res.status).toBe(401);
    });
  });

  describe('authorization', () => {
    it('returns 403 for "viewer" role', async () => {
      const res = await request(app)
        .get(`/api/commercial-intelligence/${UPLOAD_ID}`)
        .set('x-test-role', 'viewer');
      expect(res.status).toBe(403);
    });

    it('allows "owner" role through', async () => {
      mockDbLimit.mockResolvedValueOnce([{ artist_id: ARTIST_ID }]);
      const res = await request(app)
        .get(`/api/commercial-intelligence/${UPLOAD_ID}`)
        .set('x-test-role', 'owner');
      expect(res.status).toBe(200);
    });

    it('allows "admin" role through', async () => {
      mockDbLimit.mockResolvedValueOnce([{ artist_id: ARTIST_ID }]);
      const res = await request(app)
        .get(`/api/commercial-intelligence/${UPLOAD_ID}`)
        .set('x-test-role', 'admin');
      expect(res.status).toBe(200);
    });

    it('allows "editor" role through', async () => {
      mockDbLimit.mockResolvedValueOnce([{ artist_id: ARTIST_ID }]);
      const res = await request(app)
        .get(`/api/commercial-intelligence/${UPLOAD_ID}`)
        .set('x-test-role', 'editor');
      expect(res.status).toBe(200);
    });

    it('allows "team" role through', async () => {
      mockDbLimit.mockResolvedValueOnce([{ artist_id: ARTIST_ID }]);
      const res = await request(app)
        .get(`/api/commercial-intelligence/${UPLOAD_ID}`)
        .set('x-test-role', 'team');
      expect(res.status).toBe(200);
    });
  });

  describe('404 responses', () => {
    it('returns 404 when upload is not found and user is not admin', async () => {
      // 'editor' is allowed by requireRole but NOT treated as admin by isAdminUser
      mockDbLimit.mockResolvedValueOnce([]);  // no upload row
      const res = await request(app)
        .get(`/api/commercial-intelligence/${UPLOAD_ID}`)
        .set('x-test-role', 'editor');
      expect(res.status).toBe(404);
    });

    it('admin bypasses owner check — proceeds even when upload not in db', async () => {
      // Admin doesn't get 404 for missing upload (UUID probing protection bypassed for admin)
      mockDbLimit.mockResolvedValueOnce([]);  // no upload row
      const res = await request(app)
        .get(`/api/commercial-intelligence/${UPLOAD_ID}`)
        .set('x-test-role', 'admin');
      // admin proceeds → service is called → returns mock report → 200
      expect(res.status).toBe(200);
    });

    it('returns 404 when service throws "No Audio DNA" error', async () => {
      mockDbLimit.mockResolvedValueOnce([{ artist_id: ARTIST_ID }]);
      mockGetReport.mockRejectedValueOnce(new Error('No Audio DNA analysis found for upload'));
      const res = await request(app)
        .get(`/api/commercial-intelligence/${UPLOAD_ID}`)
        .set('x-test-role', 'owner');
      expect(res.status).toBe(404);
    });

    it('returns 404 when service throws "No Sync Intelligence" error', async () => {
      mockDbLimit.mockResolvedValueOnce([{ artist_id: ARTIST_ID }]);
      mockGetReport.mockRejectedValueOnce(new Error('No Sync Intelligence analysis found'));
      const res = await request(app)
        .get(`/api/commercial-intelligence/${UPLOAD_ID}`)
        .set('x-test-role', 'owner');
      expect(res.status).toBe(404);
    });

    it('passes other service errors to next (Express error handler)', async () => {
      mockDbLimit.mockResolvedValueOnce([{ artist_id: ARTIST_ID }]);
      mockGetReport.mockRejectedValueOnce(new Error('Database connection failed'));
      const res = await request(app)
        .get(`/api/commercial-intelligence/${UPLOAD_ID}`)
        .set('x-test-role', 'owner');
      expect(res.status).toBe(500);
    });
  });

  describe('successful responses', () => {
    it('returns 200 with success:true and data on valid request', async () => {
      mockDbLimit.mockResolvedValueOnce([{ artist_id: ARTIST_ID }]);
      const res = await request(app)
        .get(`/api/commercial-intelligence/${UPLOAD_ID}`)
        .set('x-test-role', 'owner');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toBeTruthy();
    });

    it('calls getCommercialIntelligenceReport with the upload_id', async () => {
      mockDbLimit.mockResolvedValueOnce([{ artist_id: ARTIST_ID }]);
      await request(app)
        .get(`/api/commercial-intelligence/${UPLOAD_ID}`)
        .set('x-test-role', 'owner');
      expect(mockGetReport).toHaveBeenCalledWith(UPLOAD_ID);
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────

describe('GET /api/commercial-intelligence/artist/:artist_id', () => {

  describe('authentication', () => {
    it('returns 401 when no token is provided', async () => {
      const res = await request(app)
        .get(`/api/commercial-intelligence/artist/${ARTIST_ID}`)
        .set('x-no-auth', 'true');
      expect(res.status).toBe(401);
    });
  });

  describe('authorization', () => {
    it('returns 403 for "viewer" role', async () => {
      const res = await request(app)
        .get(`/api/commercial-intelligence/artist/${ARTIST_ID}`)
        .set('x-test-role', 'viewer');
      expect(res.status).toBe(403);
    });

    it('allows "owner" role through', async () => {
      mockDbLimit.mockResolvedValueOnce([{ id: ARTIST_ID }]);
      const res = await request(app)
        .get(`/api/commercial-intelligence/artist/${ARTIST_ID}`)
        .set('x-test-role', 'owner');
      expect(res.status).toBe(200);
    });
  });

  describe('404 responses', () => {
    it('returns 404 when artist is not found and user is not admin', async () => {
      // 'editor' is allowed by requireRole but NOT treated as admin by isAdminUser
      mockDbLimit.mockResolvedValueOnce([]);  // no artist row
      const res = await request(app)
        .get(`/api/commercial-intelligence/artist/${ARTIST_ID}`)
        .set('x-test-role', 'editor');
      expect(res.status).toBe(404);
    });

    it('admin bypasses artist existence check', async () => {
      mockDbLimit.mockResolvedValueOnce([]);  // no artist row
      const res = await request(app)
        .get(`/api/commercial-intelligence/artist/${ARTIST_ID}`)
        .set('x-test-role', 'admin');
      expect(res.status).toBe(200);
    });
  });

  describe('successful responses', () => {
    it('returns 200 with success:true, data array, and count', async () => {
      mockDbLimit.mockResolvedValueOnce([{ id: ARTIST_ID }]);
      const res = await request(app)
        .get(`/api/commercial-intelligence/artist/${ARTIST_ID}`)
        .set('x-test-role', 'owner');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(typeof res.body.count).toBe('number');
    });

    it('respects the limit query parameter (capped at 50)', async () => {
      mockDbLimit.mockResolvedValueOnce([{ id: ARTIST_ID }]);
      await request(app)
        .get(`/api/commercial-intelligence/artist/${ARTIST_ID}?limit=5`)
        .set('x-test-role', 'owner');
      expect(mockGetArtistReports).toHaveBeenCalledWith(ARTIST_ID, 5);
    });

    it('limit is capped at 50', async () => {
      mockDbLimit.mockResolvedValueOnce([{ id: ARTIST_ID }]);
      await request(app)
        .get(`/api/commercial-intelligence/artist/${ARTIST_ID}?limit=200`)
        .set('x-test-role', 'owner');
      expect(mockGetArtistReports).toHaveBeenCalledWith(ARTIST_ID, 50);
    });

    it('default limit is 10', async () => {
      mockDbLimit.mockResolvedValueOnce([{ id: ARTIST_ID }]);
      await request(app)
        .get(`/api/commercial-intelligence/artist/${ARTIST_ID}`)
        .set('x-test-role', 'owner');
      expect(mockGetArtistReports).toHaveBeenCalledWith(ARTIST_ID, 10);
    });
  });
});

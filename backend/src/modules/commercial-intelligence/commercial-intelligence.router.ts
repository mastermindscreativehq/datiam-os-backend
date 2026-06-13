import { Router, type Request, type Response, type NextFunction } from 'express';
import { eq } from 'drizzle-orm';
import { db } from '../../db';
import { audio_uploads, artist_profiles } from '../../db/schema';
import { authenticate, requireRole } from '../../middleware/auth';
import { AppError } from '../../middleware/errorHandler';
import {
  getCommercialIntelligenceReport,
  getArtistCommercialReports,
} from './commercial-intelligence.service';
import { auditCiAccess } from './ci-audit.middleware';

const router = Router();

// ── Pre-request audit for denials (401/403) ────────────────────────────────────
// Attaches a finish listener BEFORE authenticate so it captures every rejection
// that occurs before the route handler runs (no-token, bad-token, wrong-role).
// The route handler logs its own successes and handler-level errors separately.
router.use((req: Request, res: Response, next: NextFunction): void => {
  res.on('finish', () => {
    const sc = res.statusCode;
    if (sc !== 401 && sc !== 403) return;

    // req.path in finish may be the full path (Express restores req.url after
    // the router processes the request). Extract the UUID and route type from
    // req.originalUrl which always holds the full request path.
    const fullPath = req.originalUrl ?? req.path;
    const uuidPattern = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;
    const uuidMatch = uuidPattern.exec(fullPath);
    const resourceId = uuidMatch?.[0];

    const isArtistRoute = fullPath.includes('/artist/');
    const artistId = isArtistRoute ? resourceId : undefined;
    const uploadId = !isArtistRoute ? resourceId : undefined;

    auditCiAccess(req, {
      route: isArtistRoute ? 'get_by_artist' : 'get_by_upload',
      uploadId,
      artistId,
      success: false,
      denialReason: sc === 401 ? 'unauthenticated' : 'insufficient_role',
    });
  });
  next();
});

// ── Authentication ─────────────────────────────────────────────────────────────
// Every CI route requires a valid JWT. Missing or expired tokens → 401.
router.use(authenticate);

// Read access: owner / admin / editor / team roles allowed.
// viewer role is blocked — CI reports contain confidential commercial intelligence.
const canReadCi = requireRole('owner', 'admin', 'editor', 'team');

// ── Helpers ────────────────────────────────────────────────────────────────────

function isAdminUser(req: Request): boolean {
  return req.user?.role === 'owner' || req.user?.role === 'admin';
}

// ── GET /api/commercial-intelligence/artist/:artist_id ─────────────────────────
// Registered BEFORE /:upload_id so the literal 'artist' segment takes precedence.
router.get(
  '/artist/:artist_id',
  canReadCi,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const { artist_id } = req.params;
    const rawLimit = req.query['limit'];
    const limit = Math.min(
      parseInt(typeof rawLimit === 'string' ? rawLimit : '10', 10),
      50,
    );

    try {
      // Verify the artist exists. Prevents UUID enumeration by non-admin users.
      const [artistRow] = await db
        .select({ id: artist_profiles.id })
        .from(artist_profiles)
        .where(eq(artist_profiles.id, artist_id))
        .limit(1);

      if (!isAdminUser(req) && !artistRow) {
        auditCiAccess(req, {
          route: 'get_by_artist',
          artistId: artist_id,
          success: false,
          denialReason: 'artist_not_found',
        });
        next(new AppError('Artist not found', 404));
        return;
      }

      const reports = await getArtistCommercialReports(artist_id, limit);

      auditCiAccess(req, {
        route: 'get_by_artist',
        artistId: artist_id,
        success: true,
      });

      res.json({ success: true, data: reports, count: reports.length });
    } catch (err) {
      auditCiAccess(req, {
        route: 'get_by_artist',
        artistId: artist_id,
        success: false,
        denialReason: err instanceof Error ? err.message : 'Internal server error',
      });
      next(err);
    }
  },
);

// ── GET /api/commercial-intelligence/:upload_id ────────────────────────────────
router.get(
  '/:upload_id',
  canReadCi,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const { upload_id } = req.params;

    try {
      // Resolve the artist_id for audit logging and ownership verification.
      // This single DB query prevents UUID probing by non-admin users.
      const [uploadRow] = await db
        .select({ artist_id: audio_uploads.artist_id })
        .from(audio_uploads)
        .where(eq(audio_uploads.id, upload_id))
        .limit(1);

      const artistId = uploadRow?.artist_id ?? undefined;

      if (!isAdminUser(req) && !uploadRow) {
        auditCiAccess(req, {
          route: 'get_by_upload',
          uploadId: upload_id,
          success: false,
          denialReason: 'upload_not_found',
        });
        next(new AppError('Upload not found', 404));
        return;
      }

      const report = await getCommercialIntelligenceReport(upload_id);

      auditCiAccess(req, {
        route: 'get_by_upload',
        uploadId: upload_id,
        artistId: artistId ?? undefined,
        success: true,
      });

      res.json({ success: true, data: report });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Internal server error';

      auditCiAccess(req, {
        route: 'get_by_upload',
        uploadId: upload_id,
        success: false,
        denialReason: message,
      });

      if (message.includes('No Audio DNA') || message.includes('No Sync Intelligence')) {
        res.status(404).json({ success: false, error: message });
        return;
      }
      next(err);
    }
  },
);

export default router;

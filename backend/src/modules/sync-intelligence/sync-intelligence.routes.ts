import { Router } from 'express';
import { authenticate, requireRole } from '../../middleware/auth';
import * as syncController from './sync-intelligence.controller';

const router = Router();
router.use(authenticate);

const canWrite = requireRole('owner', 'admin', 'editor', 'team');

// POST /api/sync-intelligence/analyze — enqueue sync intelligence for an upload
router.post('/analyze', canWrite, syncController.enqueueSyncAnalysis);

// GET  /api/sync-intelligence/artist/:artist_id/opportunities — top placement picks
router.get('/artist/:artist_id/opportunities', syncController.getOpportunitiesHandler);

// GET  /api/sync-intelligence/artist/:artist_id — full sync library for an artist
router.get('/artist/:artist_id', syncController.getSyncByArtistHandler);

// GET  /api/sync-intelligence/:upload_id — full result for a single upload
router.get('/:upload_id', syncController.getSyncAnalysis);

export default router;

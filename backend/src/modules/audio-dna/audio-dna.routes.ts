import { Router } from 'express';
import { authenticate, requireRole } from '../../middleware/auth';
import * as dnaController from './audio-dna.controller';

const router = Router();
router.use(authenticate);

const canWrite = requireRole('owner', 'admin', 'editor', 'team');

// POST /api/audio-dna/analyze — enqueue DNA analysis for an upload
router.post('/analyze', canWrite, dnaController.enqueueDnaAnalysis);

// GET  /api/audio-dna/artist/:artist_id — all DNA records for an artist
router.get('/artist/:artist_id', dnaController.getDnaByArtistHandler);

// GET  /api/audio-dna/:upload_id — full DNA result for an upload
router.get('/:upload_id', dnaController.getDnaAnalysis);

export default router;

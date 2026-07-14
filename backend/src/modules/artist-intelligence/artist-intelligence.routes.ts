import { Router } from 'express';
import * as artistIntelligenceController from './artist-intelligence.controller';
import { validate } from '../../middleware/validate';
import { authenticate, requireRole } from '../../middleware/auth';
import { requestTimeout } from '../../middleware/requestTimeout';
import { reportSlowRequest } from '../../db/poolHealth';
import {
  createArtistIntelligenceSchema,
  updateArtistIntelligenceSchema,
  dispatchArtistAutomationSchema,
} from './artist-intelligence.schema';

const router = Router();

// GET /:id is a pure DB lookup with no legitimate reason to run long — a
// stricter, separate ceiling than the app-wide 90s lets us both fail fast
// for users and detect pool trouble quickly (see poolHealth.ts). The
// automation dispatch route can legitimately take longer and keeps the
// app-wide ceiling.
router.use(requestTimeout(20_000, {
  skip: (req) => req.method !== 'GET',
  onTimeout: () => reportSlowRequest('artist-intelligence'),
}));

router.use(authenticate);

const canWrite = requireRole('owner', 'admin', 'editor', 'team');

router.post('/',
  canWrite, validate(createArtistIntelligenceSchema), artistIntelligenceController.createArtistProfile);

router.get('/:id', artistIntelligenceController.getArtistIntelligence);

router.patch('/:id',
  canWrite, validate(updateArtistIntelligenceSchema), artistIntelligenceController.updateArtistProfile);

router.post('/:id/automation/:category',
  canWrite, validate(dispatchArtistAutomationSchema), artistIntelligenceController.dispatchArtistAutomation);

export default router;

import { Router } from 'express';
import * as artistIntelligenceController from './artist-intelligence.controller';
import { validate } from '../../middleware/validate';
import { authenticate, requireRole } from '../../middleware/auth';
import {
  createArtistIntelligenceSchema,
  updateArtistIntelligenceSchema,
  dispatchArtistAutomationSchema,
} from './artist-intelligence.schema';

const router = Router();

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

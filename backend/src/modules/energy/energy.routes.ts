import { Router } from 'express';
import { authenticate, requireRole } from '../../middleware/auth';
import * as energyController from './energy.controller';

const router = Router();
router.use(authenticate);

const canWrite = requireRole('owner', 'admin', 'editor', 'team');

// POST /api/energy/analyze — enqueue energy analysis for an upload
router.post('/analyze', canWrite, energyController.enqueueEnergyAnalysis);

// GET  /api/energy/:upload_id — full intelligence + energy curve + sections
router.get('/:upload_id', energyController.getAnalysisResult);

// GET  /api/energy/:upload_id/sections — section breakdown only
router.get('/:upload_id/sections', energyController.getSections);

export default router;

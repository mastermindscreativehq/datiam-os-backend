import { Router } from 'express';
import * as syncController from './sync.controller';
import { getPipelineAnalytics } from './sync-intelligence.controller';
import { validate } from '../../middleware/validate';
import { authenticate, requireRole } from '../../middleware/auth';
import { createSyncPitchSchema, updateSyncPitchSchema } from './sync.schema';

const router = Router();

router.use(authenticate);

const canWrite = requireRole('owner', 'admin', 'editor', 'team');
const canDelete = requireRole('owner', 'admin');

router.get('/analytics', getPipelineAnalytics);
router.post('/', canWrite, validate(createSyncPitchSchema), syncController.createSyncPitch);
router.get('/', syncController.getSyncPitches);
router.patch('/:id', canWrite, validate(updateSyncPitchSchema), syncController.updateSyncPitch);
router.delete('/:id', canDelete, syncController.deleteSyncPitch);

export default router;

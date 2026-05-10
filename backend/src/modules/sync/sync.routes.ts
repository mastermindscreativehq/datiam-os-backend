import { Router } from 'express';
import * as syncController from './sync.controller';
import { getPipelineAnalytics } from './sync-intelligence.controller';
import { validate } from '../../middleware/validate';
import { authenticate } from '../../middleware/auth';
import { createSyncPitchSchema, updateSyncPitchSchema } from './sync.schema';

const router = Router();

router.use(authenticate);

router.get('/analytics', getPipelineAnalytics);
router.post('/', validate(createSyncPitchSchema), syncController.createSyncPitch);
router.get('/', syncController.getSyncPitches);
router.patch('/:id', validate(updateSyncPitchSchema), syncController.updateSyncPitch);

export default router;

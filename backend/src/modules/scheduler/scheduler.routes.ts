import { Router } from 'express';
import { authenticate, requireRole } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { createJobSchema, updateJobSchema } from './scheduler.schema';
import * as ctrl from './scheduler.controller';

const router = Router();

router.use(authenticate);

router.get('/', ctrl.listJobs);
router.get('/:id', ctrl.getJob);
router.post('/', requireRole('owner', 'admin'), validate(createJobSchema), ctrl.createJob);
router.patch('/:id', requireRole('owner', 'admin'), validate(updateJobSchema), ctrl.updateJob);
router.delete('/:id', requireRole('owner', 'admin'), ctrl.deleteJob);
router.post('/:id/run', requireRole('owner', 'admin'), ctrl.triggerJob);

export default router;

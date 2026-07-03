import { Router } from 'express';
import { authenticate, requireRole } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { analyzeReleaseSchema, updateMissionSchema } from './release-intel.schema';
import * as controller from './release-intel.controller';

const router = Router();
router.use(authenticate);

const canRead = requireRole('owner', 'admin', 'editor', 'team', 'viewer');
const canWrite = requireRole('owner', 'admin', 'editor', 'team');

// Mission sub-resource route — must be registered before /:releaseId to avoid param capture
router.patch('/missions/:missionId', canWrite, validate(updateMissionSchema), controller.updateMissionHandler);

router.get('/:releaseId', canRead, controller.getSnapshotHandler);
router.post('/:releaseId/analyze', canWrite, validate(analyzeReleaseSchema), controller.analyzeReleaseHandler);
router.get('/:releaseId/brief', canRead, controller.getBriefHandler);
router.get('/:releaseId/missions', canRead, controller.getMissionsHandler);

export default router;

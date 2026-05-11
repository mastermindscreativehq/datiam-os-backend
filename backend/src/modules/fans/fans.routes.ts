import { Router } from 'express';
import * as fansController from './fans.controller';
import { validate } from '../../middleware/validate';
import { authenticate, requireRole } from '../../middleware/auth';
import { createFanSchema, createFanEventSchema } from './fans.schema';

const router = Router();

router.use(authenticate);

const canWrite = requireRole('owner', 'admin', 'editor', 'team');
const canDelete = requireRole('owner', 'admin');

const updateFanSchema = createFanSchema.partial();

router.post('/', canWrite, validate(createFanSchema), fansController.createFan);
router.get('/', fansController.getFans);
router.get('/:id', fansController.getFanById);
router.patch('/:id', canWrite, validate(updateFanSchema), fansController.updateFan);
router.delete('/:id', canDelete, fansController.deleteFan);
router.post('/:id/events', canWrite, validate(createFanEventSchema), fansController.createFanEvent);

export default router;

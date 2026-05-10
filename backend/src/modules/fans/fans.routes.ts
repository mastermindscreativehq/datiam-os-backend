import { Router } from 'express';
import * as fansController from './fans.controller';
import { validate } from '../../middleware/validate';
import { authenticate } from '../../middleware/auth';
import { createFanSchema, createFanEventSchema } from './fans.schema';

const router = Router();

router.use(authenticate);

router.post('/', validate(createFanSchema), fansController.createFan);
router.get('/', fansController.getFans);
router.get('/:id', fansController.getFanById);
router.post('/:id/events', validate(createFanEventSchema), fansController.createFanEvent);

export default router;

import { Router } from 'express';
import { authenticate } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { createOutcomeSchema, updateOutcomeSchema } from './placement-outcomes.schema';
import * as controller from './placement-outcomes.controller';

const router = Router();

router.use(authenticate);

router.get('/',                              controller.list);
router.get('/stats/:artistId',               controller.getStats);
router.get('/by-opportunity/:oppId',         controller.getByOpportunity);
router.get('/:id',                           controller.getById);
router.post('/',                             validate(createOutcomeSchema), controller.create);
router.patch('/:id',                         validate(updateOutcomeSchema), controller.update);

export default router;

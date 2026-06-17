import { Router } from 'express';
import { authenticate } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { logPredictionSchema, resolvePredictionSchema } from './prediction-accuracy.schema';
import * as controller from './prediction-accuracy.controller';

const router = Router();

router.use(authenticate);

router.get('/',            controller.list);
router.get('/pending',     controller.getPending);
router.get('/stats',       controller.getStats);
router.get('/:id',         controller.getPredictionById);
router.post('/',           validate(logPredictionSchema), controller.log);
router.patch('/:id/resolve', validate(resolvePredictionSchema), controller.resolve);

export default router;

import { Router } from 'express';
import { authenticate } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { generateBlueprintSchema } from './sonic-world.schema';
import * as ctrl from './sonic-world.controller';

const router = Router();
router.use(authenticate);

router.post('/generate',                          validate(generateBlueprintSchema), ctrl.generateBlueprint);
router.get('/blueprints/:sessionId',              ctrl.getLatestBlueprint);
router.get('/blueprints/:sessionId/history',      ctrl.getBlueprintHistory);
router.get('/dashboard',                          ctrl.getDashboard);

export default router;

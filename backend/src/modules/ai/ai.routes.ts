import { Router } from 'express';
import { authenticate } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { generateRecommendationSchema } from './ai.schema';
import * as ctrl from './ai.controller';

const router = Router();

router.use(authenticate);

router.get('/', ctrl.listRecommendations);
router.post('/generate', validate(generateRecommendationSchema), ctrl.generateRecommendation);
router.patch('/:id/accept', ctrl.acceptRecommendation);
router.patch('/:id/dismiss', ctrl.dismissRecommendation);

export default router;

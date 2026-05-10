import { Router } from 'express';
import { getOverview } from './dashboard.controller';
import { authenticate } from '../../middleware/auth';

const router = Router();

router.use(authenticate);

router.get('/overview', getOverview);

export default router;

import { Router } from 'express';
import { authenticate, requireRole } from '../../middleware/auth';
import * as ctrl from './memory.controller';

const router = Router();

router.use(authenticate);
router.use(requireRole('owner', 'admin'));

router.post('/rebuild',      ctrl.rebuildMemory);
router.get('/company/:id',  ctrl.getCompanyMemory);
router.get('/contact/:id',  ctrl.getContactMemory);
router.get('/artist/:id',   ctrl.getArtistMemory);

export default router;

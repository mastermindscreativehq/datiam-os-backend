import { Router } from 'express';
import * as ctrl from './memory.controller';

const router = Router();

router.post('/rebuild',       ctrl.rebuildMemory);
router.get('/company/:id',   ctrl.getCompanyMemory);
router.get('/contact/:id',   ctrl.getContactMemory);
router.get('/artist/:id',    ctrl.getArtistMemory);

export default router;

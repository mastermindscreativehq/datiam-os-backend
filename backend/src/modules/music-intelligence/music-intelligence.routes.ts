import { Router } from 'express';
import { authenticate } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { createSessionSchema, updateSessionSchema } from './music-intelligence.schema';
import * as ctrl from './music-intelligence.controller';

const router = Router();
router.use(authenticate);

router.get('/dashboard',                                ctrl.getDashboard);
router.get('/memory',                                   ctrl.getArtistMemory);
router.get('/sessions',                                 ctrl.listSessions);
router.post('/sessions',   validate(createSessionSchema), ctrl.createSession);
router.get('/sessions/:id',                             ctrl.getSession);
router.patch('/sessions/:id', validate(updateSessionSchema), ctrl.updateSession);
router.delete('/sessions/:id',                          ctrl.deleteSession);
router.post('/sessions/:id/blueprint',                  ctrl.regenerateBlueprint);

export default router;

import { Router } from 'express';
import { validate } from '../../middleware/validate';
import { authenticate, requireRole } from '../../middleware/auth';
import { analyzeOpportunitySchema } from './intelligence.schema';
import { resolveOutcomeSchema } from './outcome-resolution.schema';
import {
  analyzeOpportunityHandler,
  resolveOutcomeHandler,
  modelPerformanceHandler,
  adaptiveWeightsHandler,
  recalculateWeightsHandler,
} from './intelligence.controller';

const router = Router();

router.use(authenticate);

const canWrite = requireRole('owner', 'admin', 'editor', 'team');

router.post('/analyze-opportunity',   canWrite, validate(analyzeOpportunitySchema), analyzeOpportunityHandler);
router.post('/resolve-outcome',       canWrite, validate(resolveOutcomeSchema),     resolveOutcomeHandler);
router.get('/model-performance',      canWrite,                                     modelPerformanceHandler);
router.get('/adaptive-weights',       canWrite,                                     adaptiveWeightsHandler);
router.post('/recalculate-weights',   canWrite,                                     recalculateWeightsHandler);

export default router;

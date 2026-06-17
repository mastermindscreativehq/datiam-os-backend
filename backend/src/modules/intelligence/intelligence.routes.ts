import { Router } from 'express';
import { validate } from '../../middleware/validate';
import { authenticate, requireRole } from '../../middleware/auth';
import { analyzeOpportunitySchema } from './intelligence.schema';
import { analyzeOpportunityHandler } from './intelligence.controller';

const router = Router();

router.use(authenticate);

const canAnalyze = requireRole('owner', 'admin', 'editor', 'team');

router.post('/analyze-opportunity', canAnalyze, validate(analyzeOpportunitySchema), analyzeOpportunityHandler);

export default router;

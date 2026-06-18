import { Router } from 'express';
import { authenticate, requireRole } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { createCampaignSchema } from './outreach.schema';
import * as controller from './outreach.controller';

const router = Router();

router.use(authenticate);

const canWrite = requireRole('owner', 'admin', 'editor', 'team');

router.post('/create-campaign', canWrite, validate(createCampaignSchema), controller.createCampaignHandler);
router.get('/campaigns',        canWrite,                                  controller.listCampaignsHandler);

export default router;

import { Router } from 'express';
import { authenticate, requireRole } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { sendCampaignSchema } from './execution.schema';
import * as controller from './execution.controller';

const router = Router();

router.use(authenticate);

const canWrite = requireRole('owner', 'admin', 'editor', 'team');

router.post('/send-campaign', canWrite, validate(sendCampaignSchema), controller.sendCampaignHandler);
router.get('/logs',           canWrite,                                controller.listLogsHandler);

export default router;

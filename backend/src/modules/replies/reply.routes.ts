import { Router } from 'express';
import { authenticate, requireRole } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { ingestReplySchema } from './reply.schema';
import * as controller from './reply.controller';

const router = Router();

router.use(authenticate);

const canWrite = requireRole('owner', 'admin', 'editor', 'team');

router.post('/ingest', canWrite, validate(ingestReplySchema), controller.ingestReplyHandler);
router.get('/logs',    canWrite,                               controller.listReplyLogsHandler);
router.get('/:id',    canWrite,                               controller.getReplyLogHandler);

export default router;

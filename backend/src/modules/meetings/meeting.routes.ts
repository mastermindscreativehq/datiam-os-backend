import { Router } from 'express';
import { authenticate, requireRole } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import {
  createMeetingSchema,
  updateMeetingStatusSchema,
  updateMeetingNotesSchema,
} from './meeting.schema';
import * as controller from './meeting.controller';

const router = Router();

router.use(authenticate);

const canRead  = requireRole('owner', 'admin', 'editor', 'team', 'viewer');
const canWrite = requireRole('owner', 'admin', 'editor', 'team');

// Analytics — must come before /:id to avoid param capture
router.get('/analytics', canRead, controller.getMeetingAnalyticsHandler);

// CRUD
router.post  ('/',              canWrite, validate(createMeetingSchema),       controller.createMeetingHandler);
router.get   ('/',              canRead,                                        controller.listMeetingsHandler);
router.get   ('/:id',           canRead,                                        controller.getMeetingHandler);
router.patch ('/:id/status',    canWrite, validate(updateMeetingStatusSchema),  controller.updateMeetingStatusHandler);
router.patch ('/:id/notes',     canWrite, validate(updateMeetingNotesSchema),   controller.updateMeetingNotesHandler);

export default router;

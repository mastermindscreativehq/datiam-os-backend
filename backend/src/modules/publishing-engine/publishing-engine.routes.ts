import { Router } from 'express';
import { authenticate, requireRole } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import {
  schedulePostSchema,
  updateScheduledPostSchema,
  publishQueueFilterSchema,
  publishedFilterSchema,
  saveCaptionSchema,
} from './publishing-engine.schema';
import * as ctrl from './publishing-engine.controller';

const router = Router();

router.use(authenticate);

const canWrite = requireRole('owner', 'admin', 'editor', 'team');
const canDelete = requireRole('owner', 'admin');

// Static paths before :id
router.get('/queue',    validate(publishQueueFilterSchema, 'query'), ctrl.getQueue);
router.get('/published', validate(publishedFilterSchema, 'query'),   ctrl.getPublished);

// Schedule & manage posts
router.post('/schedule', canWrite, validate(schedulePostSchema),               ctrl.schedulePost);
router.get('/:id',                                                              ctrl.getScheduledPost);
router.patch('/:id',    canWrite, validate(updateScheduledPostSchema),         ctrl.updateScheduledPost);
router.post('/:id/cancel', canWrite,                                            ctrl.cancelPost);

// Captions
router.post('/:id/captions',                    canWrite, validate(saveCaptionSchema), ctrl.saveCaption);
router.post('/:id/captions/:captionId/approve', canWrite,                              ctrl.approveCaption);
router.get('/:id/captions',                                                            ctrl.getCaptions);

export default router;

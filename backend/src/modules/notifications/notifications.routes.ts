import { Router } from 'express';
import { authenticate } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { notificationFilterSchema } from './notifications.schema';
import * as ctrl from './notifications.controller';

const router = Router();

router.use(authenticate);

router.get('/',              validate(notificationFilterSchema, 'query'), ctrl.getNotifications);
router.get('/unread-count',                                               ctrl.getUnreadCount);
router.post('/read-all',                                                  ctrl.markAllRead);
router.post('/dismiss-all',                                               ctrl.dismissAll);
router.post('/:id/read',                                                  ctrl.markRead);
router.post('/:id/dismiss',                                               ctrl.dismiss);

export default router;

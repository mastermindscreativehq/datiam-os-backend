import { Router } from 'express';
import { authenticate, requireRole } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import {
  createGroupSchema,
  updateGroupSchema,
  logConversationSchema,
  groupFilterSchema,
} from './growth-crm.schema';
import * as ctrl from './growth-crm.controller';

const router = Router();

router.use(authenticate);

const canWrite = requireRole('owner', 'admin', 'editor', 'team');
const canDelete = requireRole('owner', 'admin');

// Contact analytics
router.get('/contacts/vip',               ctrl.getVipContacts);
router.get('/contacts/top-collaborators', ctrl.getTopCollaborators);

// Conversation history
router.post('/contacts/:contactId/conversations',                canWrite, validate(logConversationSchema), ctrl.logConversation);
router.get('/contacts/:contactId/conversations',                                                            ctrl.getConversations);
router.post('/contacts/:contactId/collaboration-score/recalc',  canWrite,                                  ctrl.updateCollaborationScore);

// Contact groups CRUD
router.post('/groups',    canWrite, validate(createGroupSchema),             ctrl.createGroup);
router.get('/groups',    validate(groupFilterSchema, 'query'),               ctrl.listGroups);
router.get('/groups/:id',                                                    ctrl.getGroup);
router.patch('/groups/:id', canWrite, validate(updateGroupSchema),          ctrl.updateGroup);
router.delete('/groups/:id', canDelete,                                     ctrl.deleteGroup);

// Group membership
router.post('/groups/:id/members/:contactId',   canWrite, ctrl.addToGroup);
router.delete('/groups/:id/members/:contactId', canWrite, ctrl.removeFromGroup);
router.get('/groups/:id/members',                         ctrl.getGroupMembers);

export default router;

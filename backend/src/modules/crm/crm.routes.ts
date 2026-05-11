import { Router } from 'express';
import * as crmController from './crm.controller';
import { validate } from '../../middleware/validate';
import { authenticate, requireRole } from '../../middleware/auth';
import { createCrmContactSchema, updateCrmContactSchema } from './crm.schema';

const router = Router();

router.use(authenticate);

const canWrite = requireRole('owner', 'admin', 'editor', 'team');
const canDelete = requireRole('owner', 'admin');

router.post('/', canWrite, validate(createCrmContactSchema), crmController.createContact);
router.get('/', crmController.getContacts);
router.patch('/:id', canWrite, validate(updateCrmContactSchema), crmController.updateContact);
router.delete('/:id', canDelete, crmController.deleteContact);

export default router;

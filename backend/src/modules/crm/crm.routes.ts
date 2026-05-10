import { Router } from 'express';
import * as crmController from './crm.controller';
import { validate } from '../../middleware/validate';
import { authenticate } from '../../middleware/auth';
import { createCrmContactSchema, updateCrmContactSchema } from './crm.schema';

const router = Router();

router.use(authenticate);

router.post('/', validate(createCrmContactSchema), crmController.createContact);
router.get('/', crmController.getContacts);
router.patch('/:id', validate(updateCrmContactSchema), crmController.updateContact);

export default router;

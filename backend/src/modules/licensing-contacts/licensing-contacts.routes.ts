import { Router } from 'express';
import { authenticate } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { createContactSchema, updateContactSchema } from './licensing-contacts.schema';
import * as controller from './licensing-contacts.controller';

const router = Router();

router.use(authenticate);

router.get('/',             controller.list);
router.get('/follow-ups',   controller.getFollowUps);
router.get('/:id',          controller.getById);
router.post('/',            validate(createContactSchema), controller.create);
router.patch('/:id',        validate(updateContactSchema), controller.update);
router.delete('/:id',       controller.remove);

export default router;

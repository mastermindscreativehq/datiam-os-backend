import { Router } from 'express';
import { authenticate } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { createCompanySchema, updateCompanySchema } from './companies.schema';
import * as controller from './companies.controller';

const router = Router();

router.use(authenticate);

router.get('/',    controller.list);
router.get('/:id', controller.getById);
router.post('/',   validate(createCompanySchema), controller.create);
router.patch('/:id', validate(updateCompanySchema), controller.update);
router.delete('/:id', controller.remove);

export default router;

import { Router } from 'express';
import * as royaltiesController from './royalties.controller';
import { validate } from '../../middleware/validate';
import { authenticate } from '../../middleware/auth';
import { createRoyaltySchema } from './royalties.schema';

const router = Router();

router.use(authenticate);

router.post('/', validate(createRoyaltySchema), royaltiesController.createRoyalty);
router.get('/', royaltiesController.getRoyalties);
router.get('/song/:songId', royaltiesController.getRoyaltiesBySong);

export default router;

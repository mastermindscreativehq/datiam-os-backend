import { Router } from 'express';
import * as royaltiesController from './royalties.controller';
import { validate } from '../../middleware/validate';
import { authenticate, requireRole } from '../../middleware/auth';
import { createRoyaltySchema } from './royalties.schema';

const router = Router();

router.use(authenticate);

const canWrite = requireRole('owner', 'admin', 'editor', 'team');
const canDelete = requireRole('owner', 'admin');

router.post('/', canWrite, validate(createRoyaltySchema), royaltiesController.createRoyalty);
router.get('/', royaltiesController.getRoyalties);
router.get('/song/:songId', royaltiesController.getRoyaltiesBySong);
router.delete('/:id', canDelete, royaltiesController.deleteRoyalty);

export default router;

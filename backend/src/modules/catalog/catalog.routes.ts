import { Router } from 'express';
import * as catalogController from './catalog.controller';
import { validate } from '../../middleware/validate';
import { authenticate, requireRole } from '../../middleware/auth';
import {
  createSongSchema,
  updateSongSchema,
  createAssetSchema,
  createContributorSchema,
} from './catalog.schema';

const router = Router();

router.use(authenticate);

const canWrite = requireRole('owner', 'admin', 'editor', 'team');
const canDelete = requireRole('owner', 'admin');

// /api/songs
router.post('/', canWrite, validate(createSongSchema), catalogController.createSong);
router.get('/', catalogController.getSongs);
router.get('/:id', catalogController.getSongById);
router.patch('/:id', canWrite, validate(updateSongSchema), catalogController.updateSong);
router.delete('/:id', canDelete, catalogController.deleteSong);

// /api/songs/:id/assets
router.post('/:id/assets', canWrite, validate(createAssetSchema), catalogController.createAsset);
router.get('/:id/assets', catalogController.getAssets);

// /api/songs/:id/contributors
router.post('/:id/contributors', canWrite, validate(createContributorSchema), catalogController.createContributor);
router.get('/:id/contributors', catalogController.getContributors);

export default router;

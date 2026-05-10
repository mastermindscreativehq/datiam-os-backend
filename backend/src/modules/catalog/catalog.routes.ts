import { Router } from 'express';
import * as catalogController from './catalog.controller';
import { validate } from '../../middleware/validate';
import { authenticate } from '../../middleware/auth';
import {
  createSongSchema,
  updateSongSchema,
  createAssetSchema,
  createContributorSchema,
} from './catalog.schema';

const router = Router();

router.use(authenticate);

router.post('/', validate(createSongSchema), catalogController.createSong);
router.get('/', catalogController.getSongs);
router.get('/:id', catalogController.getSongById);
router.patch('/:id', validate(updateSongSchema), catalogController.updateSong);
router.delete('/:id', catalogController.deleteSong);

router.post('/:id/assets', validate(createAssetSchema), catalogController.createAsset);
router.get('/:id/assets', catalogController.getAssets);

router.post('/:id/contributors', validate(createContributorSchema), catalogController.createContributor);
router.get('/:id/contributors', catalogController.getContributors);

export default router;

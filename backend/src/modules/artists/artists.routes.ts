import { Router } from 'express';
import { getProfile, createProfile, updateProfile } from './artists.controller';
import { validate } from '../../middleware/validate';
import { authenticate } from '../../middleware/auth';
import { createArtistSchema, updateArtistSchema } from './artists.schema';

const router = Router();

router.use(authenticate);

router.get('/profile', getProfile);
router.post('/profile', validate(createArtistSchema), createProfile);
router.patch('/profile/:id', validate(updateArtistSchema), updateProfile);

export default router;

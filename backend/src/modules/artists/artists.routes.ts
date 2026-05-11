import { Router } from 'express';
import { listArtists, createProfile, updateProfile, deleteProfile } from './artists.controller';
import { validate } from '../../middleware/validate';
import { authenticate, requireRole } from '../../middleware/auth';
import { createArtistSchema, updateArtistSchema } from './artists.schema';

const router = Router();

router.use(authenticate);

const canWrite = requireRole('owner', 'admin');
const canDelete = requireRole('owner', 'admin');

router.get('/', listArtists);
router.post('/', canWrite, validate(createArtistSchema), createProfile);
router.patch('/:id', canWrite, validate(updateArtistSchema), updateProfile);
router.delete('/:id', canDelete, deleteProfile);

// Legacy aliases kept for backward compatibility
router.get('/profile', listArtists);
router.post('/profile', canWrite, validate(createArtistSchema), createProfile);
router.patch('/profile/:id', canWrite, validate(updateArtistSchema), updateProfile);

export default router;

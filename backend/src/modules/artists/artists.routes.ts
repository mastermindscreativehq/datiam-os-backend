import { Router } from 'express';
import { listArtists, createProfile, updateProfile, deleteProfile } from './artists.controller';
import { validate } from '../../middleware/validate';
import { authenticate, requireRole } from '../../middleware/auth';
import { requestTimeout } from '../../middleware/requestTimeout';
import { reportSlowRequest } from '../../db/poolHealth';
import { createArtistSchema, updateArtistSchema } from './artists.schema';

const router = Router();

// GET reads here are pure DB lookups with no legitimate reason to run long —
// a stricter, separate ceiling than the app-wide 90s lets us both fail fast
// for users and detect pool trouble quickly (see poolHealth.ts).
router.use(requestTimeout(20_000, {
  skip: (req) => req.method !== 'GET',
  onTimeout: () => reportSlowRequest('artists'),
}));

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

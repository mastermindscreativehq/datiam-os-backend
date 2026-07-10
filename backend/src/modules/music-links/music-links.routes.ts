import { Router } from 'express';
import * as musicLinksController from './music-links.controller';
import { validate } from '../../middleware/validate';
import { authenticate, requireRole } from '../../middleware/auth';
import {
  createMusicLinkSchema,
  updateMusicLinkSchema,
  reorderMusicLinksSchema,
} from './music-links.schema';

const router = Router();

router.use(authenticate);

const canWrite  = requireRole('owner', 'admin', 'editor', 'team');
const canDelete = requireRole('owner', 'admin');

// ── Static sub-routes (must come before /:id) ─────────────────────────────────
router.get('/artist/:artistId', musicLinksController.getLinksByArtist);
router.get('/release/:releaseId', musicLinksController.getLinksByRelease);

router.patch('/reorder',
  canWrite, validate(reorderMusicLinksSchema), musicLinksController.reorderMusicLinks);

// ── CRUD ───────────────────────────────────────────────────────────────────────
router.get('/', musicLinksController.listMusicLinks);

router.post('/',
  canWrite, validate(createMusicLinkSchema), musicLinksController.createMusicLink);

router.get('/:id', musicLinksController.getMusicLinkById);

router.patch('/:id',
  canWrite, validate(updateMusicLinkSchema), musicLinksController.updateMusicLink);

router.delete('/:id',
  canDelete, musicLinksController.deleteMusicLink);

export default router;

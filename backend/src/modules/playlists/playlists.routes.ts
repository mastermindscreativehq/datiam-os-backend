import { Router } from 'express';
import * as playlistsController from './playlists.controller';
import { validate } from '../../middleware/validate';
import { authenticate, requireRole } from '../../middleware/auth';
import {
  createPlaylistSchema,
  updatePlaylistSchema,
  createPitchSchema,
  updatePitchStatusSchema,
  createPlacementSchema,
  createAnalyticsSchema,
  recordOutreachTouchSchema,
  linkCampaignSchema,
} from './playlists.schema';

const router = Router();

router.use(authenticate);

const canWrite = requireRole('owner', 'admin', 'editor', 'team');
const canDelete = requireRole('owner', 'admin');

// playlists
router.post('/', canWrite, validate(createPlaylistSchema), playlistsController.createPlaylist);
router.get('/', playlistsController.getPlaylists);
router.get('/:id', playlistsController.getPlaylistById);
router.patch('/:id', canWrite, validate(updatePlaylistSchema), playlistsController.updatePlaylist);
router.delete('/:id', canDelete, playlistsController.deletePlaylist);

// pitches
router.post('/pitches', canWrite, validate(createPitchSchema), playlistsController.createPitch);
router.get('/:playlistId/pitches', playlistsController.getPitchesByPlaylist);
router.get('/song/:songId/pitches', playlistsController.getPitchesBySong);
router.patch('/pitches/:id/status', canWrite, validate(updatePitchStatusSchema), playlistsController.updatePitchStatus);

// placements
router.post('/placements', canWrite, validate(createPlacementSchema), playlistsController.recordPlacement);
router.get('/:playlistId/placements', playlistsController.getPlacementsByPlaylist);
router.get('/song/:songId/placements', playlistsController.getPlacementsBySong);
router.patch('/placements/:id/remove', canWrite, playlistsController.removePlacement);

// analytics
router.post('/analytics', canWrite, validate(createAnalyticsSchema), playlistsController.recordAnalyticsSnapshot);
router.get('/placements/:placementId/analytics', playlistsController.getAnalyticsByPlacement);

// outreach history
router.post('/outreach-history', canWrite, validate(recordOutreachTouchSchema), playlistsController.recordOutreachTouch);
router.get('/:playlistId/outreach-history', playlistsController.getOutreachHistory);

// campaign links
router.post('/campaign-links', canWrite, validate(linkCampaignSchema), playlistsController.linkCampaign);
router.get('/:playlistId/campaigns', playlistsController.getCampaignsForPlaylist);

export default router;

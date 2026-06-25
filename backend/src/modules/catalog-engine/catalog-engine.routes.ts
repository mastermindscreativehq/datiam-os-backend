import { Router } from 'express';
import * as catalogController from './catalog-engine.controller';
import { validate } from '../../middleware/validate';
import { authenticate, requireRole } from '../../middleware/auth';
import {
  createArtistSchema,
  updateArtistSchema,
  createSongSchemaV2,
  updateSongSchemaV2,
  createReleaseSchemaV2,
  updateReleaseSchemaV2,
  createTrackSchema,
  createArtworkSchema,
  createCreditSchema,
  updateCreditSchema,
  createDocumentSchema,
  createIdentifierSchema,
} from './catalog-engine.schema';

const router = Router();

// All catalog routes require authentication
router.use(authenticate);

const canWrite  = requireRole('owner', 'admin', 'editor', 'team');
const canDelete = requireRole('owner', 'admin');

// ── Global catalog routes (must come before /:id routes) ──────────────────────
router.get('/search',  catalogController.searchCatalog);
router.get('/stats',   catalogController.getCatalogStats);
router.get('/missing', catalogController.getMissingMetadata);

// ── Artist routes ─────────────────────────────────────────────────────────────
router.get('/artists',
  catalogController.getArtists);

router.post('/artists',
  canWrite, validate(createArtistSchema), catalogController.createArtist);

// Static artist sub-routes (before /:id)
router.get('/artists/search',  catalogController.searchCatalog);
router.get('/artists/stats',   catalogController.getCatalogStats);
router.get('/artists/missing', catalogController.getMissingMetadata);

router.get('/artists/:id',
  catalogController.getArtistById);

router.patch('/artists/:id',
  canWrite, validate(updateArtistSchema), catalogController.updateArtist);

router.delete('/artists/:id',
  canDelete, catalogController.deleteArtist);

router.get('/artists/:id/songs',
  catalogController.getArtistSongs);

router.get('/artists/:id/releases',
  catalogController.getArtistReleases);

router.get('/artists/:id/stats',
  catalogController.getArtistStats);

// ── Song routes ───────────────────────────────────────────────────────────────
router.get('/songs',
  catalogController.getSongs);

router.post('/songs',
  canWrite, validate(createSongSchemaV2), catalogController.createSong);

router.get('/songs/:id',
  catalogController.getSongById);

router.patch('/songs/:id',
  canWrite, validate(updateSongSchemaV2), catalogController.updateSong);

router.delete('/songs/:id',
  canDelete, catalogController.deleteSong);

router.get('/songs/:id/assets',
  catalogController.getSongAssets);

router.post('/songs/:id/assets',
  canWrite, catalogController.addSongAsset);

router.get('/songs/:id/credits',
  catalogController.getSongCredits);

router.post('/songs/:id/credits',
  canWrite, validate(createCreditSchema), catalogController.addSongCredit);

router.patch('/songs/:id/credits/:creditId',
  canWrite, validate(updateCreditSchema), catalogController.updateSongCredit);

router.delete('/songs/:id/credits/:creditId',
  canDelete, catalogController.deleteSongCredit);

router.get('/songs/:id/documents',
  catalogController.getSongDocuments);

router.post('/songs/:id/documents',
  canWrite, validate(createDocumentSchema), catalogController.addSongDocument);

router.get('/songs/:id/identifiers',
  catalogController.getSongIdentifiers);

router.post('/songs/:id/identifiers',
  canWrite, validate(createIdentifierSchema), catalogController.addSongIdentifier);

// ── Release routes ────────────────────────────────────────────────────────────
router.get('/releases',
  catalogController.getReleases);

router.post('/releases',
  canWrite, validate(createReleaseSchemaV2), catalogController.createRelease);

router.get('/releases/:id',
  catalogController.getReleaseById);

router.patch('/releases/:id',
  canWrite, validate(updateReleaseSchemaV2), catalogController.updateRelease);

router.delete('/releases/:id',
  canDelete, catalogController.deleteRelease);

router.get('/releases/:id/tracks',
  catalogController.getReleaseTracks);

router.post('/releases/:id/tracks',
  canWrite, validate(createTrackSchema), catalogController.addReleaseTrack);

router.delete('/releases/:id/tracks/:trackId',
  canDelete, catalogController.removeReleaseTrack);

router.get('/releases/:id/artwork',
  catalogController.getReleaseArtwork);

router.post('/releases/:id/artwork',
  canWrite, validate(createArtworkSchema), catalogController.addReleaseArtwork);

router.delete('/releases/:id/artwork/:artworkId',
  canDelete, catalogController.deleteArtwork);

router.get('/releases/:id/identifiers',
  catalogController.getReleaseIdentifiers);

router.post('/releases/:id/identifiers',
  canWrite, validate(createIdentifierSchema), catalogController.addReleaseIdentifier);

export default router;

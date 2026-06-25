import { Request, Response, NextFunction } from 'express';
import * as artistService from './artists.service';
import * as songService from './songs.service';
import * as releaseService from './releases.service';
import * as searchService from './catalog-search.service';

// ── Artist Controllers ────────────────────────────────────────────────────────

export const createArtist = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await artistService.createArtist(req.body);
    res.status(201).json({ success: true, data: result });
  } catch (err) { next(err); }
};

export const getArtists = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await artistService.getArtists(req.query as Record<string, string>);
    res.json({ success: true, data: result.data, pagination: result.pagination });
  } catch (err) { next(err); }
};

export const getArtistById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await artistService.getArtistById(req.params.id);
    res.json({ success: true, data: result });
  } catch (err) { next(err); }
};

export const updateArtist = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await artistService.updateArtist(req.params.id, req.body);
    res.json({ success: true, data: result });
  } catch (err) { next(err); }
};

export const deleteArtist = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await artistService.deleteArtist(req.params.id);
    res.json({ success: true, data: result });
  } catch (err) { next(err); }
};

export const getArtistStats = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await artistService.getArtistStats(req.params.id);
    res.json({ success: true, data: result });
  } catch (err) { next(err); }
};

export const getArtistSongs = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await artistService.getArtistSongs(req.params.id);
    res.json({ success: true, data: result });
  } catch (err) { next(err); }
};

export const getArtistReleases = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await artistService.getArtistReleases(req.params.id);
    res.json({ success: true, data: result });
  } catch (err) { next(err); }
};

// ── Song Controllers ──────────────────────────────────────────────────────────

export const createSong = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await songService.createSong(req.body);
    res.status(201).json({ success: true, data: result });
  } catch (err) { next(err); }
};

export const getSongs = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await songService.getSongs(req.query as Record<string, string>);
    res.json({ success: true, data: result.data, pagination: result.pagination });
  } catch (err) { next(err); }
};

export const getSongById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await songService.getSongById(req.params.id);
    res.json({ success: true, data: result });
  } catch (err) { next(err); }
};

export const updateSong = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await songService.updateSong(req.params.id, req.body);
    res.json({ success: true, data: result });
  } catch (err) { next(err); }
};

export const deleteSong = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await songService.deleteSong(req.params.id);
    res.json({ success: true, data: result });
  } catch (err) { next(err); }
};

export const getSongAssets = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await songService.getSongAssets(req.params.id);
    res.json({ success: true, data: result });
  } catch (err) { next(err); }
};

export const addSongAsset = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await songService.addSongAsset(req.params.id, req.body);
    res.status(201).json({ success: true, data: result });
  } catch (err) { next(err); }
};

export const getSongCredits = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await songService.getSongCredits(req.params.id);
    res.json({ success: true, data: result });
  } catch (err) { next(err); }
};

export const addSongCredit = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await songService.addSongCredit(req.params.id, req.body);
    res.status(201).json({ success: true, data: result });
  } catch (err) { next(err); }
};

export const updateSongCredit = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await songService.updateSongCredit(req.params.creditId, req.body);
    res.json({ success: true, data: result });
  } catch (err) { next(err); }
};

export const deleteSongCredit = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await songService.deleteSongCredit(req.params.creditId);
    res.json({ success: true, data: result });
  } catch (err) { next(err); }
};

export const getSongDocuments = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await songService.getSongDocuments(req.params.id);
    res.json({ success: true, data: result });
  } catch (err) { next(err); }
};

export const addSongDocument = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await songService.addSongDocument(req.params.id, req.body);
    res.status(201).json({ success: true, data: result });
  } catch (err) { next(err); }
};

export const getSongIdentifiers = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await songService.getSongIdentifiers(req.params.id);
    res.json({ success: true, data: result });
  } catch (err) { next(err); }
};

export const addSongIdentifier = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await songService.addSongIdentifier(req.params.id, req.body);
    res.status(201).json({ success: true, data: result });
  } catch (err) { next(err); }
};

// ── Release Controllers ───────────────────────────────────────────────────────

export const createRelease = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await releaseService.createRelease(req.body);
    res.status(201).json({ success: true, data: result });
  } catch (err) { next(err); }
};

export const getReleases = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await releaseService.getReleases(req.query as Record<string, string>);
    res.json({ success: true, data: result.data, pagination: result.pagination });
  } catch (err) { next(err); }
};

export const getReleaseById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await releaseService.getReleaseById(req.params.id);
    res.json({ success: true, data: result });
  } catch (err) { next(err); }
};

export const updateRelease = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await releaseService.updateRelease(req.params.id, req.body);
    res.json({ success: true, data: result });
  } catch (err) { next(err); }
};

export const deleteRelease = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await releaseService.deleteRelease(req.params.id);
    res.json({ success: true, data: result });
  } catch (err) { next(err); }
};

export const getReleaseTracks = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await releaseService.getReleaseTracks(req.params.id);
    res.json({ success: true, data: result });
  } catch (err) { next(err); }
};

export const addReleaseTrack = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await releaseService.addReleaseTrack(req.params.id, req.body);
    res.status(201).json({ success: true, data: result });
  } catch (err) { next(err); }
};

export const removeReleaseTrack = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await releaseService.removeReleaseTrack(req.params.trackId);
    res.json({ success: true, data: result });
  } catch (err) { next(err); }
};

export const getReleaseArtwork = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await releaseService.getReleaseArtwork(req.params.id);
    res.json({ success: true, data: result });
  } catch (err) { next(err); }
};

export const addReleaseArtwork = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await releaseService.addReleaseArtwork(req.params.id, req.body);
    res.status(201).json({ success: true, data: result });
  } catch (err) { next(err); }
};

export const deleteArtwork = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await releaseService.deleteArtwork(req.params.artworkId);
    res.json({ success: true, data: result });
  } catch (err) { next(err); }
};

export const getReleaseIdentifiers = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await releaseService.getReleaseIdentifiers(req.params.id);
    res.json({ success: true, data: result });
  } catch (err) { next(err); }
};

export const addReleaseIdentifier = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await releaseService.addReleaseIdentifier(req.params.id, req.body);
    res.status(201).json({ success: true, data: result });
  } catch (err) { next(err); }
};

// ── Search Controllers ────────────────────────────────────────────────────────

export const searchCatalog = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { q, query, limit } = req.query as Record<string, string>;
    const searchTerm = q ?? query ?? '';
    const result = await searchService.searchCatalog(searchTerm, limit ? parseInt(limit, 10) : 20);
    res.json({ success: true, data: result });
  } catch (err) { next(err); }
};

export const getCatalogStats = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await searchService.getCatalogStats();
    res.json({ success: true, data: result });
  } catch (err) { next(err); }
};

export const getMissingMetadata = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await searchService.getMissingMetadata();
    res.json({ success: true, data: result });
  } catch (err) { next(err); }
};

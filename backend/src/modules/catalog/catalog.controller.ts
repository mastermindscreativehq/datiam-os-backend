import { Request, Response, NextFunction } from 'express';
import * as catalogService from './catalog.service';
import type { SongFilters } from './catalog.service';
import { logActivity } from '../../lib/activityLogger';
import { success } from '../../utils/response';

export const createSong = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const song = await catalogService.createSong(req.body);
    logActivity({
      userId: req.user?.id,
      userEmail: req.user?.email,
      eventType: 'song.created',
      module: 'catalog',
      entityType: 'song',
      entityId: song.id,
      title: `Song created: ${song.title}`,
      description: `Added "${song.title}" to the catalog`,
      severity: 'info',
      requestId: req.requestId,
      metadata: {
        songId: song.id,
        title: song.title,
        artistId: song.artist_id,
        releaseId: song.release_id,
        status: song.status,
        slug: song.slug,
      },
    });
    success(res, song, 201);
  } catch (err) {
    next(err);
  }
};

export const getSongs = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const filters: SongFilters = {
      artist_id: req.query.artistId as string | undefined,
      release_id: req.query.releaseId as string | undefined,
      status: req.query.status as string | undefined,
      genre: req.query.genre as string | undefined,
      explicit:
        req.query.explicit === 'true'
          ? true
          : req.query.explicit === 'false'
            ? false
            : undefined,
    };
    success(res, await catalogService.getSongs(filters));
  } catch (err) {
    next(err);
  }
};

export const getSongById = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    success(res, await catalogService.getSongById(req.params.id));
  } catch (err) {
    next(err);
  }
};

export const updateSong = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const song = await catalogService.updateSong(req.params.id, req.body);
    logActivity({
      userId: req.user?.id,
      userEmail: req.user?.email,
      eventType: 'song.updated',
      module: 'catalog',
      entityType: 'song',
      entityId: song.id,
      title: `Song updated: ${song.title}`,
      description: `Updated catalog entry for "${song.title}"`,
      severity: 'info',
      requestId: req.requestId,
      metadata: {
        songId: song.id,
        title: song.title,
        changedFields: Object.keys(req.body),
      },
    });
    success(res, song);
  } catch (err) {
    next(err);
  }
};

export const deleteSong = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const result = await catalogService.deleteSong(req.params.id);
    logActivity({
      userId: req.user?.id,
      userEmail: req.user?.email,
      eventType: 'song.deleted',
      module: 'catalog',
      entityType: 'song',
      entityId: req.params.id,
      title: 'Song deleted',
      description: `Removed song ${req.params.id} from the catalog`,
      severity: 'warning',
      requestId: req.requestId,
      metadata: { songId: req.params.id },
    });
    success(res, result);
  } catch (err) {
    next(err);
  }
};

export const createAsset = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    success(res, await catalogService.createAsset(req.params.id, req.body), 201);
  } catch (err) {
    next(err);
  }
};

export const getAssets = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    success(res, await catalogService.getAssets(req.params.id));
  } catch (err) {
    next(err);
  }
};

export const createContributor = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    success(res, await catalogService.createContributor(req.params.id, req.body), 201);
  } catch (err) {
    next(err);
  }
};

export const getContributors = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    success(res, await catalogService.getContributors(req.params.id));
  } catch (err) {
    next(err);
  }
};

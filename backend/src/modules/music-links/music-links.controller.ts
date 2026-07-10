import { Request, Response, NextFunction } from 'express';
import * as musicLinksService from './music-links.service';

export const listMusicLinks = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await musicLinksService.listMusicLinks(req.query as Record<string, string>);
    res.json({ success: true, data: result });
  } catch (err) { next(err); }
};

export const getLinksByArtist = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await musicLinksService.getLinksByArtist(req.params.artistId);
    res.json({ success: true, data: result });
  } catch (err) { next(err); }
};

export const getLinksByRelease = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await musicLinksService.getLinksByRelease(req.params.releaseId);
    res.json({ success: true, data: result });
  } catch (err) { next(err); }
};

export const getMusicLinkById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await musicLinksService.getMusicLinkById(req.params.id);
    res.json({ success: true, data: result });
  } catch (err) { next(err); }
};

export const createMusicLink = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await musicLinksService.createMusicLink(req.body);
    res.status(201).json({ success: true, data: result });
  } catch (err) { next(err); }
};

export const updateMusicLink = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await musicLinksService.updateMusicLink(req.params.id, req.body);
    res.json({ success: true, data: result });
  } catch (err) { next(err); }
};

export const deleteMusicLink = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await musicLinksService.deleteMusicLink(req.params.id);
    res.json({ success: true, data: result });
  } catch (err) { next(err); }
};

export const reorderMusicLinks = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await musicLinksService.reorderMusicLinks(req.body);
    res.json({ success: true, data: result });
  } catch (err) { next(err); }
};

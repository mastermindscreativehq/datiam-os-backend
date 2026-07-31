import { Request, Response, NextFunction } from 'express';
import * as playlistsService from './playlists.service';
import { logActivity } from '../../lib/activityLogger';
import { success } from '../../utils/response';

export const createPlaylist = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const playlist = await playlistsService.createPlaylist(req.body);
    logActivity({
      userId: req.user?.id,
      userEmail: req.user?.email,
      eventType: 'playlist.created',
      module: 'playlists',
      entityType: 'playlist',
      entityId: playlist.id,
      title: `Playlist added: ${playlist.name}`,
      description: `Created ${playlist.type} playlist "${playlist.name}"`,
      severity: 'info',
      requestId: req.requestId,
      metadata: { playlistId: playlist.id, type: playlist.type },
    });
    success(res, playlist, 201);
  } catch (err) { next(err); }
};

export const getPlaylists = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { type, dsp } = req.query;
    success(res, await playlistsService.getPlaylists({
      type: typeof type === 'string' ? type : undefined,
      dsp: typeof dsp === 'string' ? dsp : undefined,
    }));
  } catch (err) { next(err); }
};

export const getPlaylistById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try { success(res, await playlistsService.getPlaylistById(req.params.id)); }
  catch (err) { next(err); }
};

export const updatePlaylist = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const updated = await playlistsService.updatePlaylist(req.params.id, req.body);
    logActivity({
      userId: req.user?.id,
      userEmail: req.user?.email,
      eventType: 'playlist.updated',
      module: 'playlists',
      entityType: 'playlist',
      entityId: updated.id,
      title: `Playlist updated: ${updated.name}`,
      description: `Updated playlist ${updated.id}`,
      severity: 'info',
      requestId: req.requestId,
      metadata: { playlistId: updated.id },
    });
    success(res, updated);
  } catch (err) { next(err); }
};

export const deletePlaylist = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const result = await playlistsService.deletePlaylist(req.params.id);
    logActivity({
      userId: req.user?.id,
      userEmail: req.user?.email,
      eventType: 'playlist.deleted',
      module: 'playlists',
      entityType: 'playlist',
      entityId: req.params.id,
      title: 'Playlist deleted',
      description: `Removed playlist ${req.params.id}`,
      severity: 'warning',
      requestId: req.requestId,
      metadata: { playlistId: req.params.id },
    });
    success(res, result);
  } catch (err) { next(err); }
};

export const createPitch = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const pitch = await playlistsService.createPitch(req.body);
    logActivity({
      userId: req.user?.id,
      userEmail: req.user?.email,
      eventType: 'playlist_pitch.created',
      module: 'playlists',
      entityType: 'playlist_pitch',
      entityId: pitch.id,
      title: 'Playlist pitch created',
      description: `Pitched song ${pitch.song_id} to playlist ${pitch.playlist_id}`,
      severity: 'info',
      requestId: req.requestId,
      metadata: { pitchId: pitch.id, playlistId: pitch.playlist_id, songId: pitch.song_id },
    });
    success(res, pitch, 201);
  } catch (err) { next(err); }
};

export const getPitchesByPlaylist = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try { success(res, await playlistsService.getPitchesByPlaylist(req.params.playlistId)); }
  catch (err) { next(err); }
};

export const getPitchesBySong = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try { success(res, await playlistsService.getPitchesBySong(req.params.songId)); }
  catch (err) { next(err); }
};

export const updatePitchStatus = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const updated = await playlistsService.updatePitchStatus(req.params.id, req.body);
    logActivity({
      userId: req.user?.id,
      userEmail: req.user?.email,
      eventType: 'playlist_pitch.status_changed',
      module: 'playlists',
      entityType: 'playlist_pitch',
      entityId: updated.id,
      title: `Playlist pitch ${updated.status}`,
      description: `Pitch ${updated.id} moved to ${updated.status}`,
      severity: 'info',
      requestId: req.requestId,
      metadata: { pitchId: updated.id, status: updated.status },
    });
    success(res, updated);
  } catch (err) { next(err); }
};

export const recordPlacement = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const placement = await playlistsService.recordPlacement(req.body);
    logActivity({
      userId: req.user?.id,
      userEmail: req.user?.email,
      eventType: 'playlist_placement.recorded',
      module: 'playlists',
      entityType: 'playlist_placement',
      entityId: placement.id,
      title: 'Playlist placement recorded',
      description: `Song ${placement.song_id} placed on playlist ${placement.playlist_id}`,
      severity: 'info',
      requestId: req.requestId,
      metadata: { placementId: placement.id, playlistId: placement.playlist_id },
    });
    success(res, placement, 201);
  } catch (err) { next(err); }
};

export const getPlacementsByPlaylist = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try { success(res, await playlistsService.getPlacementsByPlaylist(req.params.playlistId)); }
  catch (err) { next(err); }
};

export const getPlacementsBySong = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try { success(res, await playlistsService.getPlacementsBySong(req.params.songId)); }
  catch (err) { next(err); }
};

export const removePlacement = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const updated = await playlistsService.removePlacement(req.params.id);
    logActivity({
      userId: req.user?.id,
      userEmail: req.user?.email,
      eventType: 'playlist_placement.removed',
      module: 'playlists',
      entityType: 'playlist_placement',
      entityId: updated.id,
      title: 'Playlist placement removed',
      description: `Placement ${updated.id} marked removed`,
      severity: 'warning',
      requestId: req.requestId,
      metadata: { placementId: updated.id },
    });
    success(res, updated);
  } catch (err) { next(err); }
};

export const recordAnalyticsSnapshot = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try { success(res, await playlistsService.recordAnalyticsSnapshot(req.body), 201); }
  catch (err) { next(err); }
};

export const getAnalyticsByPlacement = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try { success(res, await playlistsService.getAnalyticsByPlacement(req.params.placementId)); }
  catch (err) { next(err); }
};

export const recordOutreachTouch = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try { success(res, await playlistsService.recordOutreachTouch(req.body), 201); }
  catch (err) { next(err); }
};

export const getOutreachHistory = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try { success(res, await playlistsService.getOutreachHistory(req.params.playlistId)); }
  catch (err) { next(err); }
};

export const linkCampaign = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try { success(res, await playlistsService.linkCampaign(req.body), 201); }
  catch (err) { next(err); }
};

export const getCampaignsForPlaylist = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try { success(res, await playlistsService.getCampaignsForPlaylist(req.params.playlistId)); }
  catch (err) { next(err); }
};

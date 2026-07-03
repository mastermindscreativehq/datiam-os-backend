import type { Request, Response, NextFunction } from 'express';
import * as service from './release-intel.service';

const ok = (res: Response, data: unknown, status = 200) => res.status(status).json({ success: true, data });

export const getSnapshotHandler = async (req: Request, res: Response, next: NextFunction) => {
  try {
    ok(res, await service.getReleaseIntelSnapshot(req.params.releaseId));
  } catch (e) { next(e); }
};

export const analyzeReleaseHandler = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { force } = req.body as { force?: boolean };
    await service.analyzeRelease(req.params.releaseId, { force });
    ok(res, await service.getReleaseIntelSnapshot(req.params.releaseId));
  } catch (e) { next(e); }
};

export const getBriefHandler = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { history } = req.query as { history?: string };
    if (history === 'true') {
      ok(res, await service.getBriefHistory(req.params.releaseId));
      return;
    }
    const snapshot = await service.getReleaseIntelSnapshot(req.params.releaseId);
    ok(res, snapshot.brief);
  } catch (e) { next(e); }
};

export const getMissionsHandler = async (req: Request, res: Response, next: NextFunction) => {
  try {
    ok(res, await service.getMissions(req.params.releaseId));
  } catch (e) { next(e); }
};

export const updateMissionHandler = async (req: Request, res: Response, next: NextFunction) => {
  try {
    ok(res, await service.updateMission(req.params.missionId, req.body));
  } catch (e) { next(e); }
};

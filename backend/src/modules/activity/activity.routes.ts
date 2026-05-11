import { Router, Request, Response, NextFunction } from 'express';
import { authenticate } from '../../middleware/auth';
import { getRecentActivity, getActivityStats } from './activity.service';
import { AppError } from '../../middleware/errorHandler';
import { success } from '../../utils/response';

const router = Router();

router.use(authenticate);

router.get('/recent', async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    success(res, await getRecentActivity());
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(JSON.stringify({ event: 'activity_recent_error', error: message }));
    // Surface the real error (e.g. "column event_type does not exist") so the UI can display it
    next(new AppError(message, 503, 'ACTIVITY_QUERY_FAILED'));
  }
});

router.get('/stats', async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    // getActivityStats never throws — it returns empty stats with _error on failure
    success(res, await getActivityStats());
  } catch (err) {
    next(err);
  }
});

export default router;

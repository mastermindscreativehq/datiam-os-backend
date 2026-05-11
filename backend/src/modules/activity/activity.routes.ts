import { Router, Request, Response, NextFunction } from 'express';
import { authenticate } from '../../middleware/auth';
import { getRecentActivity } from './activity.service';
import { success } from '../../utils/response';

const router = Router();

router.use(authenticate);

router.get('/recent', async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    success(res, await getRecentActivity());
  } catch (err) {
    next(err);
  }
});

export default router;

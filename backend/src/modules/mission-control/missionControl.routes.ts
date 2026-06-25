import { Router } from 'express';
import { Request, Response } from 'express';
import { authenticate } from '../../middleware/auth';
import { getMissionBrief, getGlobalSearch } from './missionControl.service';

const router = Router();

router.use(authenticate);

router.get('/brief', async (_req: Request, res: Response): Promise<void> => {
  try {
    const data = await getMissionBrief();
    res.status(200).json({ success: true, data });
  } catch (err) {
    console.error('[MissionControl] brief error:', err instanceof Error ? err.message : err);
    res.status(200).json({
      success: true,
      data: {
        brief: { prioritizedActions: [], topOpportunities: [], urgentRisks: [] },
        criticalActions: { releasesDue: [], contractsAwaitingReview: [], outreachFollowups: [], meetingsToday: [], paymentsExpected: [] },
        opportunityFeed: { syncOpportunities: [], openDeals: [] },
        automationStatus: { totalRuns: 0, successCount: 0, failedCount: 0, lastRun: null, successRate: 0, queueHealth: 'healthy' },
        risks: [],
        releases: [],
      },
    });
  }
});

router.get('/search', async (req: Request, res: Response): Promise<void> => {
  try {
    const q = String(req.query.q ?? '').trim();
    if (!q || q.length < 2) {
      res.status(200).json({ success: true, data: { results: [] } });
      return;
    }
    const limit = Math.min(Number(req.query.limit ?? 20), 50);
    const results = await getGlobalSearch(q, limit);
    res.status(200).json({ success: true, data: { results } });
  } catch (err) {
    console.error('[MissionControl] search error:', err instanceof Error ? err.message : err);
    res.status(200).json({ success: true, data: { results: [] } });
  }
});

export default router;

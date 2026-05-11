import { Request, Response } from 'express';
import * as dashboardService from './dashboard.service';

const SAFE_DEFAULTS = {
  fans:             { total: 0, active: 0, growth_rate: 0, engagement_avg: 0 },
  songs:            { total: 0, released: 0, drafts: 0 },
  revenue_summary:  { total_tracked: 0, monthly: 0, currency: 'USD' },
  sync_pitches:     { active: 0, pending: 0, won: 0, win_rate: 0 },
  releases:         { live: 0, upcoming: 0 },
  tasks:            { pending: 0, completed: 0 },
  automation:       { runs: 0, successful: 0, failed: 0 },
  ai_recommendations: [] as any[],
};

export const getOverview = async (_req: Request, res: Response): Promise<void> => {
  const deadline = new Promise<typeof SAFE_DEFAULTS>((resolve) =>
    setTimeout(() => {
      console.log('[Dashboard] controller hard timeout — returning defaults');
      resolve(SAFE_DEFAULTS);
    }, 3000),
  );

  const data = await Promise.race([
    dashboardService.getDashboardOverview().catch((err) => {
      console.error('[Dashboard] service error:', err instanceof Error ? err.message : err);
      return SAFE_DEFAULTS;
    }),
    deadline,
  ]);

  res.status(200).json({ success: true, data });
};

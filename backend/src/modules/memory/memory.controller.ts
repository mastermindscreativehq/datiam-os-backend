import type { Request, Response, NextFunction } from 'express';
import * as memoryService from './memory.service';

// Track the timestamp of the last rebuild to prevent accidental rapid re-runs.
let lastRebuildAt: Date | null = null;
const REBUILD_COOLDOWN_MS = 5 * 60 * 1000; // 5 minutes

export const rebuildMemory = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const dryRun = req.body?.dryRun === true || req.query.dryRun === 'true';
    const limitParam = req.body?.limit ?? req.query.limit;
    const limit = limitParam !== undefined ? parseInt(String(limitParam), 10) : undefined;

    if (limit !== undefined && (isNaN(limit) || limit < 1 || limit > 10_000)) {
      res.status(400).json({ success: false, error: 'limit must be an integer between 1 and 10000' });
      return;
    }

    // Idempotency guard — reject if a rebuild ran in the last 5 minutes
    if (!dryRun && lastRebuildAt) {
      const elapsed = Date.now() - lastRebuildAt.getTime();
      if (elapsed < REBUILD_COOLDOWN_MS) {
        const retryAfter = Math.ceil((REBUILD_COOLDOWN_MS - elapsed) / 1000);
        res.status(429).json({
          success: false,
          error: `Rebuild already ran ${Math.floor(elapsed / 1000)}s ago. Retry after ${retryAfter}s.`,
          last_rebuild_at: lastRebuildAt.toISOString(),
          retry_after_seconds: retryAfter,
        });
        return;
      }
    }

    if (dryRun) {
      const counts = await memoryService.countMemoryRecords();
      res.json({ success: true, dry_run: true, ...counts });
      return;
    }

    const result = await memoryService.rebuildAllMemory(limit);
    lastRebuildAt = new Date();
    res.json({ success: true, ...result });
  } catch (err) {
    next(err);
  }
};

export const getCompanyMemory = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await memoryService.getCompanyMemory(req.params.id);
    res.json(data);
  } catch (err) {
    next(err);
  }
};

export const getContactMemory = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await memoryService.getContactMemory(req.params.id);
    res.json(data);
  } catch (err) {
    next(err);
  }
};

export const getArtistMemory = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await memoryService.getArtistMemory(req.params.id);
    res.json(data);
  } catch (err) {
    next(err);
  }
};

import { Request, Response, NextFunction } from 'express';
import { captureMessage } from '../lib/sentry';

// A query that stalls mid-flight (e.g. the TCP path to the DB drops packets
// silently, with no RST) leaves its pool connection permanently "busy" —
// idle_timeout/max_lifetime never fire because the connection is never idle.
// Without this, that single stalled request hangs forever and the client
// (browser/axios) never gets a response. This bounds every request to a
// fixed ceiling so a stalled downstream call fails fast and visibly instead
// of hanging the request indefinitely.
export function requestTimeout(ms: number, opts: { skip?: (req: Request) => boolean } = {}) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (opts.skip?.(req)) return next();

    const timer = setTimeout(() => {
      if (res.headersSent) return;
      captureMessage('Request timed out', 'error', { path: req.path, method: req.method, requestId: req.requestId });
      res.status(503).json({
        success: false,
        error: 'Request timed out — the server took too long to respond. Please retry.',
        requestId: req.requestId,
      });
    }, ms);

    res.on('finish', () => clearTimeout(timer));
    res.on('close', () => clearTimeout(timer));
    next();
  };
}

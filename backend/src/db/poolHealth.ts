import { recreateDbClient } from './index';
import { captureMessage } from '../lib/sentry';

// Tracks real request timeouts on routes that have no legitimate reason to
// take this long (pure DB reads — see requestTimeout's onTimeout hook on
// release-intel/artist-intelligence/releases/artists). A cluster of these is
// a strong, low-false-positive signal that a pool connection has wedged
// (see recreateDbClient in ./index for the failure mode), since a genuinely
// slow-but-alive query wouldn't repeatedly blow a generous per-route ceiling.
const WINDOW_MS = 10 * 60 * 1000; // 10 minutes
const THRESHOLD = 3;              // timeouts within the window
const COOLDOWN_MS = 5 * 60 * 1000; // don't recreate more than once per 5 min

let timeoutTimestamps: number[] = [];
let lastRecreateAt = 0;

export function reportSlowRequest(source: string): void {
  const now = Date.now();
  timeoutTimestamps = timeoutTimestamps.filter((t) => now - t < WINDOW_MS);
  timeoutTimestamps.push(now);

  if (timeoutTimestamps.length < THRESHOLD) return;
  if (now - lastRecreateAt < COOLDOWN_MS) return;

  lastRecreateAt = now;
  timeoutTimestamps = [];

  captureMessage('DB pool self-heal triggered', 'warning', { source, threshold: THRESHOLD, windowMs: WINDOW_MS });
  void recreateDbClient(`${THRESHOLD}+ slow-route timeouts in ${WINDOW_MS / 1000}s (last source: ${source})`);
}

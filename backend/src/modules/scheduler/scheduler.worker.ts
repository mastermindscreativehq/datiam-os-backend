import { tickScheduler } from './scheduler.service';

const TICK_INTERVAL_MS = 60_000;

let timer: NodeJS.Timeout | null = null;

function safeTickScheduler(): void {
  tickScheduler().catch((err: unknown) => {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes('does not exist') || msg.includes('relation')) {
      console.warn('[Scheduler] Table not ready — run migrations. Skipping tick.');
    } else {
      console.error('[Scheduler] Tick error:', err);
    }
  });
}

export function startSchedulerWorker(): void {
  if (timer) return;
  console.log('[Scheduler] Worker started — ticking every 60s');

  timer = setInterval(safeTickScheduler, TICK_INTERVAL_MS);

  // Fire once at startup to catch any overdue jobs
  safeTickScheduler();
}

export function stopSchedulerWorker(): void {
  if (timer) {
    clearInterval(timer);
    timer = null;
    console.log('[Scheduler] Worker stopped');
  }
}

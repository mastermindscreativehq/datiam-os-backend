import * as Sentry from '@sentry/node';

let _enabled = false;

export function initSentry(): void {
  const dsn = process.env.SENTRY_DSN;
  if (!dsn) {
    console.log('[Sentry] SENTRY_DSN not configured — error monitoring disabled');
    return;
  }
  Sentry.init({
    dsn,
    environment: process.env.NODE_ENV ?? 'development',
    release: process.env.APP_VERSION ?? '1.0.0',
    tracesSampleRate: 0.05,
  });
  _enabled = true;
  console.log('[Sentry] Initialized');
}

export function captureException(err: unknown, extra?: Record<string, unknown>): void {
  if (!_enabled) return;
  Sentry.withScope((scope) => {
    if (extra) scope.setExtras(extra);
    Sentry.captureException(err);
  });
}

export function captureMessage(
  message: string,
  level: Sentry.SeverityLevel = 'info',
  extra?: Record<string, unknown>,
): void {
  if (!_enabled) return;
  Sentry.withScope((scope) => {
    if (extra) scope.setExtras(extra);
    Sentry.captureMessage(message, level);
  });
}

export { Sentry };

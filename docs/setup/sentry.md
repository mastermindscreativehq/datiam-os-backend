# DATIAM OS — Sentry Error Monitoring Setup

## Overview

Sentry captures exceptions, authentication failures, database errors, queue failures, and unhandled rejections from the backend. It is **optional** — the backend runs normally without it.

## Installation

`@sentry/node` is already installed in the backend. No frontend Sentry package is required.

## Configuration

Set the following environment variable in your Railway (or local `.env`) project:

```bash
SENTRY_DSN=https://xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx@oXXXXXX.ingest.sentry.io/XXXXXXX
```

If `SENTRY_DSN` is not set, Sentry is silently disabled. No errors, no warnings.

## Creating a Sentry Project

1. Go to [sentry.io](https://sentry.io) and create an account or log in.
2. Create a new project → select **Node.js**.
3. Copy the DSN from **Settings → Client Keys**.
4. Add it as `SENTRY_DSN` to your environment.

## What Gets Captured

| Event               | Capture Type | Sentry Level |
|---------------------|-------------|--------------|
| Authentication failure (401) | Message | warning |
| API server errors (5xx) | Exception | error |
| Unhandled promise rejections | Exception | error |
| Database probe failures (Watchdog) | Exception | error |
| Redis probe failures (Watchdog) | Exception | error |

## Architecture

**Init:** `backend/src/lib/sentry.ts`  
`initSentry()` is called at the top of `server.ts`, before any other module loads. This ensures Sentry is ready before Express routes or workers start.

**Capture helpers:**
```typescript
import { captureException, captureMessage } from './lib/sentry';

// Capture an exception with context
captureException(err, { component: 'database', requestId });

// Capture a message at a specific level
captureMessage('Auth failure', 'warning', { path: req.path });
```

**Error handler integration:** `backend/src/middleware/errorHandler.ts`  
All 5xx errors and authentication failures are automatically sent to Sentry with request context (path, method, requestId).

**Watchdog integration:** `backend/src/modules/monitoring/watchdog.service.ts`  
Database and Redis probe failures are captured during every Watchdog tick.

## Environment Configuration

```bash
# .env (local development)
SENTRY_DSN=https://...@....ingest.sentry.io/...

# Optional: tag releases in Sentry
APP_VERSION=1.0.0
```

## Verifying Sentry is Working

After setting `SENTRY_DSN`, check the server startup log:

```
[Sentry] Initialized
```

If you see `[Sentry] SENTRY_DSN not configured — error monitoring disabled`, the variable is not set.

To trigger a test event, make a request that causes a 500 error and check the Sentry dashboard for a new issue.

## Sentry Dashboard

Key sections to monitor:

- **Issues** → unhandled exceptions grouped by stack trace
- **Performance** → (disabled by default, tracesSampleRate=0.05)
- **Alerts** → configure email/Slack notifications for new issues

## Release Tracking

To track which deployment introduced a bug, set `APP_VERSION` to match your git tag or commit SHA in the Railway environment variables:

```bash
APP_VERSION=v1.2.3
# or
APP_VERSION=ff2b07f
```

Sentry will tag all events with this release version.

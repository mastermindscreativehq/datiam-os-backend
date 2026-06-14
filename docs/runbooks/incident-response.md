# Runbook: Incident Response

## Incident Severity Levels

| Level    | Definition                                  | Response Time |
|----------|---------------------------------------------|---------------|
| critical | Database down — all features broken          | Immediate     |
| error    | Redis/queue down — audio/AI jobs failing     | < 15 min      |
| warning  | Queue degraded — BullMQ workers unavailable  | < 1 hour      |
| info     | Non-breaking anomaly                         | Next business day |

## Incident Lifecycle

```
PROBE FAILS              PROBE RECOVERS
    │                          │
    ▼                          ▼
[open incident]          [resolve incident]
 incidents table          incidents table
 Watchdog log             Watchdog log
 Sentry event             activity_log
```

Incidents are created and resolved **automatically** by the Watchdog. Manual resolution via the Admin Diagnostics UI or API is also available.

## Response Procedures

### Critical — Database Outage

**Symptoms:**
- `/health` returns HTTP 503
- `database: "disconnected"`
- All API endpoints returning 500
- Login and all features unavailable

**Steps:**
1. Open Sentry dashboard — check for error cluster with DB errors.
2. Open Railway dashboard → check PostgreSQL service status.
3. If Railway Postgres is healthy, check `DATABASE_URL` env var is still set.
4. Try a direct connection from local: `psql "$DATABASE_URL" -c "SELECT 1"`.
5. If Supabase, check [status.supabase.com](https://status.supabase.com).
6. Restart the DATIAM OS backend service on Railway after connectivity is restored.
7. Verify the `database_outage` incident auto-resolves within 60s.

### Error — Redis Outage

**Symptoms:**
- `/health` returns HTTP 200 with `status: "degraded"`
- `redis: "disconnected"`
- BullMQ workers offline — audio processing, energy analysis, DNA analysis stop
- Background jobs queued but not processed

**Steps:**
1. Check Railway Redis service status.
2. Verify `REDIS_URL` is set in the backend environment.
3. Restart Railway Redis service if needed.
4. Check backend logs for `[Redis] ERROR:` lines.
5. Once Redis is back, BullMQ workers reconnect automatically.
6. Check if any queued jobs need manual reprocessing.

### Warning — Queue Degraded

This is automatically the consequence of Redis being unavailable. Resolve the Redis outage and queue will recover automatically.

## Communication

During a critical incident, update the team:

1. Identify affected features based on incident type.
2. Post a status update with: start time, affected features, ETA.
3. After resolution, post a resolution message with: end time, root cause, next steps.

## Post-Incident Review

After every `critical` or `error` incident, complete:

1. **Timeline** — when was it detected, by what mechanism, when resolved.
2. **Root cause** — what failed and why.
3. **Impact** — which users/features were affected, for how long.
4. **Action items** — what changes prevent recurrence.

Create an incident document at `docs/incidents/incident-NNN-<slug>.md`.

## Incident Document Template

```markdown
# Incident NNN — [Title]

**Date:** YYYY-MM-DD  
**Duration:** Xh Ym  
**Severity:** critical / error / warning  
**Status:** resolved  

## Summary
One-sentence description.

## Timeline
- HH:MM — [event]
- HH:MM — [event]

## Root Cause
Description of what failed and why.

## Impact
Which users and features were affected.

## Resolution
What was done to fix it.

## Action Items
- [ ] Item 1
- [ ] Item 2
```

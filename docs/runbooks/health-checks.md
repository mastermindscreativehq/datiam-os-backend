# Runbook: Health Checks

## Overview

This runbook describes how to investigate and respond to health check failures in DATIAM OS.

## Health Check Endpoints

| Endpoint                    | Auth | Purpose                          |
|-----------------------------|------|----------------------------------|
| GET /health                 | None | Full system status (uptime monitors) |
| GET /health/deep            | None | Legacy format status check       |
| GET /api/monitoring/status  | None | Same as /health, via /api prefix |
| GET /api/monitoring/history | JWT  | Last 50 Watchdog checks          |
| GET /api/monitoring/incidents | JWT | All incidents                  |

## Status Values

### Overall Status
- `healthy` (HTTP 200) — Database connected, Redis connected or not configured
- `degraded` (HTTP 200) — Database connected, Redis disconnected  
- `critical` (HTTP 503) — Database disconnected

### Component Status
- `connected` / `disconnected` — for Database and Redis
- `not_configured` — Redis: REDIS_URL not set
- `healthy` / `degraded` / `not_configured` — for Queue

## Diagnosing Failures

### Database `disconnected`

1. Check Railway Postgres service status in the Railway dashboard.
2. Verify `DATABASE_URL` is set correctly in environment variables.
3. Check backend logs for connection errors:
   ```
   railway logs | grep -i "postgres\|database\|db"
   ```
4. Verify SSL mode — this project requires `rejectUnauthorized: false` for Supabase/Railway (see `backend/src/db/index.ts`).
5. Check connection pool — max 10 connections. If all are exhausted, new queries queue or timeout.

**Quick test:**
```bash
# From local machine with DATABASE_URL set:
psql "$DATABASE_URL" -c "SELECT 1"
```

### Redis `disconnected`

1. Check Railway Redis service status.
2. Verify `REDIS_URL` is set and correct.
3. Check whether URL starts with `redis://` (plain) or `rediss://` (TLS). TLS is only for `rediss://` — see `backend/src/queues/index.ts`.
4. Check backend logs:
   ```
   railway logs | grep -i "redis"
   ```
5. BullMQ workers will fail if Redis is down. Queue jobs will accumulate.

### Queue `degraded`

Queue status is derived from Redis. If Redis is `disconnected`, queue is `degraded`. Resolve the Redis issue first.

## Watchdog Behaviour

The Watchdog runs every 60 seconds and:
1. Probes DB and Redis
2. Writes a row to `health_checks`
3. Opens an incident if a probe fails
4. Resolves the incident when the probe succeeds again

If the Watchdog itself cannot write to the database (e.g., DB is down), health_checks rows won't be created. This is expected and non-fatal.

## Checking Health History

Via the Admin Diagnostics UI: navigate to `/admin/diagnostics`

Via API:
```bash
curl -H "Authorization: Bearer $TOKEN" \
  https://your-api.railway.app/api/monitoring/history
```

## Resolving an Incident Manually

Via Admin Diagnostics: click **RESOLVE** on the open incident.

Via API:
```bash
curl -X POST \
  -H "Authorization: Bearer $TOKEN" \
  https://your-api.railway.app/api/monitoring/incidents/$INCIDENT_ID/resolve
```

## Alert Thresholds

| Condition           | Response                    | Severity |
|---------------------|-----------------------------|----------|
| DB disconnected     | Open `database_outage`      | critical |
| Redis disconnected  | Open `redis_outage`         | error    |
| Queue degraded      | Open `queue_degraded`       | warning  |
| Uptime < 5 min      | New deployment or crash     | info     |

## Escalation

1. Check Sentry for related exceptions (if `SENTRY_DSN` is configured).
2. Check Railway logs for crash/restart events.
3. If database is down, check Supabase status at status.supabase.com.
4. If Redis is down, check Railway Redis service health.

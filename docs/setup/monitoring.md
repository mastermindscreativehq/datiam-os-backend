# DATIAM OS — Production Monitoring

## Architecture

The monitoring system consists of four layers:

```
┌──────────────────────────────────────────────────────────────┐
│                   MONITORING LAYERS                           │
├──────────────────────────────────────────────────────────────┤
│  1. Health Endpoint   GET /health                            │
│     Real-time DB + Redis + Queue status check                │
│                                                              │
│  2. Watchdog Engine   runs every 60s                         │
│     Polls all subsystems, writes history, opens incidents    │
│                                                              │
│  3. Sentry            error capture                          │
│     API errors, auth failures, DB failures, unhandled       │
│                                                              │
│  4. Admin Diagnostics /admin/diagnostics                     │
│     Frontend dashboard — live status + history + incidents   │
└──────────────────────────────────────────────────────────────┘
```

## Health Endpoint

### GET /health

Public endpoint. Returns full system status.

**Response (healthy):**
```json
{
  "status": "healthy",
  "version": "1.0.0",
  "environment": "production",
  "uptime": 3600,
  "timestamp": "2026-06-14T12:00:00.000Z",
  "checks": {
    "database": { "status": "connected", "responseTimeMs": 8 },
    "redis":    { "status": "connected", "responseTimeMs": 2 },
    "queue":    { "status": "healthy" }
  },
  "responseTimeMs": 12
}
```

**Status values:**
- `healthy` → HTTP 200 — all systems nominal
- `degraded` → HTTP 200 — non-critical component down (Redis/Queue)
- `critical` → HTTP 503 — database unreachable

### GET /health/deep

Backward-compatible alias. Returns legacy format.

### GET /api/monitoring/status

Same as `/health` but mounted under `/api` (requires no auth). Useful when the frontend `apiClient` base URL is set to `/api`.

### GET /api/monitoring/history

Protected (JWT required). Returns the last 50 Watchdog health check records.

### GET /api/monitoring/incidents

Protected (JWT required). Returns all incidents (open and resolved).

### POST /api/monitoring/incidents/:id/resolve

Protected (JWT required). Marks an open incident as resolved.

## Watchdog Engine

**File:** `backend/src/modules/monitoring/watchdog.service.ts`

- Starts automatically on server boot
- Runs every **60 seconds**
- Writes each result to the `health_checks` table
- Detects failures and opens incidents in the `incidents` table
- Auto-resolves incidents when the service recovers
- Captures exceptions to Sentry

**Probe logic:**
1. `db.execute(sql\`SELECT 1\`)` → database connectivity
2. `redis.ping()` → Redis connectivity (if REDIS_URL is set)
3. Queue status is derived from Redis state

## Database Tables

### `health_checks`
Stores every Watchdog probe result (one row per 60s tick).

| Column           | Type      | Description              |
|------------------|-----------|--------------------------|
| id               | uuid      | Primary key              |
| status           | text      | healthy / degraded / critical |
| database_status  | text      | connected / disconnected |
| redis_status     | text      | connected / disconnected / not_configured |
| queue_status     | text      | healthy / degraded / not_configured |
| response_time_ms | integer   | Total probe duration (ms) |
| details          | jsonb     | Reserved for extra metadata |
| created_at       | timestamptz | Probe timestamp         |

### `incidents`
Tracks outages detected by the Watchdog.

| Column       | Type        | Description                     |
|--------------|-------------|---------------------------------|
| id           | uuid        | Primary key                     |
| incident_key | text        | e.g. `database_outage`          |
| severity     | text        | warning / error / critical      |
| title        | text        | Human-readable title            |
| description  | text        | Auto-generated description      |
| status       | text        | open / resolved                 |
| started_at   | timestamptz | When the incident was detected  |
| resolved_at  | timestamptz | When it auto-resolved           |
| metadata     | jsonb       | Source and context              |
| created_at   | timestamptz | Row creation timestamp          |

**Incident keys:**
- `database_outage` — PostgreSQL unreachable
- `redis_outage` — Redis unreachable
- `queue_degraded` — BullMQ queue system degraded

## Environment Variables

| Variable      | Required | Description                        |
|---------------|----------|------------------------------------|
| DATABASE_URL  | Yes      | PostgreSQL connection string       |
| REDIS_URL     | No       | Redis connection string for BullMQ |
| SENTRY_DSN    | No       | Sentry project DSN for error capture |
| APP_VERSION   | No       | Version string shown in health check |

## Uptime Monitoring (External)

Configure UptimeRobot or similar to poll `GET /health` every minute.

- **URL:** `https://your-api.railway.app/health`
- **Method:** GET
- **Expected status:** 200
- **Alert on:** 503 or timeout

## Deployment

The monitoring system is zero-config. It starts automatically with the server. No additional services or cron jobs are needed outside the Node.js process.

On Railway, the health endpoint is used by the platform health check. Configure it in the Railway service settings:
- **Health check path:** `/health`
- **Health check timeout:** 10s

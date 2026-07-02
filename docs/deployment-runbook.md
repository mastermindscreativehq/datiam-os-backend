# DATIAM OS — Railway Deployment Runbook

## Pre-deploy checklist

- [ ] All migrations up to 0047 applied (`drizzle-kit migrate`)
- [ ] `DATABASE_URL` set in Railway Variables (Supabase connection string, `sslmode=require`)
- [ ] `JWT_SECRET` set — strong random string (min 32 chars)
- [ ] `ADMIN_EMAIL` + `ADMIN_PASSWORD` set (min 8 chars)
- [ ] `ANTHROPIC_API_KEY` set (Growth OS AI features)
- [ ] `N8N_WEBHOOK_BASE_URL` set (e.g. `https://your-n8n.railway.app`)
- [ ] `N8N_WEBHOOK_SECRET` set — shared secret between DATIAM and n8n
- [ ] `REDIS_URL` set (Railway Redis plugin or external — enables BullMQ queues)
- [ ] `SENTRY_DSN` set (optional — enables error monitoring)

## Deploy steps

### 1. Apply migrations

```bash
# From backend directory
npx drizzle-kit migrate
```

### 2. Run seed

```bash
# Seeds admin user, artist profile, platform definitions, countries
npx tsx src/db/seed.ts
```

### 3. Seed automation workflows

```bash
# Seeds workflow_registry entries for all n8n workflows
curl -X POST https://your-app.railway.app/api/automation/seed \
  -H "Authorization: Bearer <owner-jwt>"
```

### 4. Import n8n workflow templates

```bash
# Requires n8n running and N8N_API_URL env var set
cd n8n && bash scripts/import-workflows.sh
```

### 5. Run smoke test

```bash
export BASE_URL=https://your-app.railway.app
export TOKEN=<owner-jwt-from-login>
bash scripts/smoke-test.sh
```

## Environment variable reference

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | Yes | Supabase PostgreSQL connection string |
| `JWT_SECRET` | Yes | JWT signing secret (min 32 chars) |
| `ADMIN_EMAIL` | Yes | Owner account email |
| `ADMIN_PASSWORD` | Yes | Owner account password (min 8 chars) |
| `ANTHROPIC_API_KEY` | Growth OS AI | Claude Haiku for AI generation |
| `REDIS_URL` | Queues | BullMQ — omit to run without queues |
| `N8N_WEBHOOK_BASE_URL` | Automation | n8n instance base URL |
| `N8N_WEBHOOK_SECRET` | Automation | Shared webhook auth secret |
| `SENTRY_DSN` | Optional | Sentry error monitoring |
| `SUPABASE_URL` | Optional | Supabase client SDK |
| `SUPABASE_SERVICE_ROLE_KEY` | Optional | Supabase admin operations |

See `backend/.env.example` for the full list including Growth OS social API keys.

## Post-deploy verification

```bash
# Liveness
curl https://your-app.railway.app/ping

# Auth guard (should return 401)
curl https://your-app.railway.app/api/growth/content

# Full smoke test with auth
BASE_URL=https://your-app.railway.app TOKEN=<jwt> bash scripts/smoke-test.sh
```

## Rollback

Railway keeps the previous deploy snapshot. Use the Railway dashboard → Deployments → Rollback to restore the previous build. Migrations are additive and do not need reverting for a code rollback.

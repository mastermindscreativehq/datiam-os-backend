# Incident 001 — Login Outage (Template Example)

**Date:** 2026-06-14  
**Duration:** ~45 minutes  
**Severity:** critical  
**Status:** resolved  

## Summary

The DATIAM OS login endpoint returned 500 for all users due to a database SSL configuration mismatch after a Railway infrastructure update.

## Timeline

| Time (UTC) | Event |
|------------|-------|
| 10:15      | First 500 error reported on `/api/auth/login` |
| 10:17      | `/health` endpoint confirmed `database: "disconnected"` |
| 10:18      | Watchdog opened `database_outage` incident, logged to `incidents` table |
| 10:20      | Sentry alerted: "Error: self-signed certificate in certificate chain" |
| 10:25      | Root cause identified — `rejectUnauthorized: true` in DB connection config |
| 10:30      | Fix deployed: `rejectUnauthorized: false` in `backend/src/db/index.ts` |
| 10:35      | `/health` confirmed `database: "connected"` |
| 10:36      | Watchdog auto-resolved `database_outage` incident |
| 11:00      | Monitoring confirmed stable for 25 minutes |

## Root Cause

Supabase uses a certificate chain that is not included in Node.js's default CA bundle. Setting `rejectUnauthorized: true` causes every database connection attempt to fail with `SELF_SIGNED_CERT_IN_CHAIN`.

This is a known Supabase/Railway constraint documented in `backend/src/db/index.ts`:
```typescript
ssl: { rejectUnauthorized: false }
// sslmode=require — connection is always encrypted.
// rejectUnauthorized:true fails on Railway because Supabase's CA
// is not in Node.js's default trust store.
```

## Impact

- **Affected users:** All authenticated users (100%)
- **Affected features:** Login, all API endpoints requiring authentication
- **Duration:** ~45 minutes

## Resolution

Reverted `rejectUnauthorized` to `false` in `backend/src/db/index.ts`. This setting maintains encrypted SSL connections (sslmode=require) without validating the certificate chain against Node.js's built-in CA store.

Deployed via Railway auto-deploy from commit `ff2b07f`.

## Action Items

- [x] Add comment to `db/index.ts` explaining why `rejectUnauthorized: false` is required
- [x] Add feedback memory to prevent future regression
- [x] Add `/health` endpoint with database connectivity check
- [x] Deploy Watchdog to auto-detect future database outages
- [ ] Configure UptimeRobot to monitor `/health` and alert within 2 minutes
- [ ] Configure Sentry alert for `database_outage` incident key

## Lessons Learned

1. The Watchdog + health endpoint combination immediately surfaced the outage. Without it, the first indication was a user report.
2. Sentry's "self-signed certificate" error message pointed directly to the root cause.
3. The `rejectUnauthorized: false` setting must never be changed without understanding the Supabase/Railway SSL constraint.

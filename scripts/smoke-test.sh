#!/usr/bin/env bash
# DATIAM OS — Post-Deploy Smoke Test
# Usage: BASE_URL=https://your-app.railway.app TOKEN=<jwt> ./scripts/smoke-test.sh

set -euo pipefail

BASE_URL="${BASE_URL:-http://localhost:3000}"
TOKEN="${TOKEN:-}"
PASS=0
FAIL=0

green() { echo -e "\033[32m✓ $1\033[0m"; }
red()   { echo -e "\033[31m✗ $1\033[0m"; }

check() {
  local label="$1"
  local expected="$2"
  local actual="$3"
  if echo "$actual" | grep -q "$expected"; then
    green "$label"
    PASS=$((PASS + 1))
  else
    red "$label (got: $actual)"
    FAIL=$((FAIL + 1))
  fi
}

AUTH_HEADER=""
if [ -n "$TOKEN" ]; then
  AUTH_HEADER="-H \"Authorization: Bearer $TOKEN\""
fi

echo ""
echo "=== DATIAM OS Smoke Test ==="
echo "    Target: $BASE_URL"
echo ""

# ── Core health ───────────────────────────────────────────────────────────────

echo "--- Core ---"
check "GET /ping → ok" '"ok":true' \
  "$(curl -sf "$BASE_URL/ping" 2>/dev/null || echo '{}')"

# ── Auth (unauthenticated guard check) ───────────────────────────────────────

echo "--- Auth guards ---"
for path in \
  "/api/growth/content" \
  "/api/growth/campaigns" \
  "/api/growth/social-accounts" \
  "/api/growth/publishing/scheduled" \
  "/api/growth/analytics" \
  "/api/growth/trends" \
  "/api/growth/crm/contacts" \
  "/api/growth/notifications"
do
  STATUS=$(curl -so /dev/null -w "%{http_code}" "$BASE_URL$path" 2>/dev/null)
  check "GET $path → 401" "401" "$STATUS"
done

# ── If token provided: authenticated routes ───────────────────────────────────

if [ -n "$TOKEN" ]; then
  echo "--- Authenticated routes ---"

  check "GET /api/growth/content → 200" '"success":true' \
    "$(curl -sf -H "Authorization: Bearer $TOKEN" "$BASE_URL/api/growth/content" 2>/dev/null || echo '{}')"

  check "GET /api/growth/campaigns → 200" '"success":true' \
    "$(curl -sf -H "Authorization: Bearer $TOKEN" "$BASE_URL/api/growth/campaigns" 2>/dev/null || echo '{}')"

  check "GET /api/growth/social-accounts → 200" '"success":true' \
    "$(curl -sf -H "Authorization: Bearer $TOKEN" "$BASE_URL/api/growth/social-accounts" 2>/dev/null || echo '{}')"

  check "GET /api/growth/trends → 200" '"success":true' \
    "$(curl -sf -H "Authorization: Bearer $TOKEN" "$BASE_URL/api/growth/trends" 2>/dev/null || echo '{}')"

  check "GET /api/growth/crm/contacts → 200" '"success":true' \
    "$(curl -sf -H "Authorization: Bearer $TOKEN" "$BASE_URL/api/growth/crm/contacts" 2>/dev/null || echo '{}')"

  check "GET /api/growth/notifications → 200" '"success":true' \
    "$(curl -sf -H "Authorization: Bearer $TOKEN" "$BASE_URL/api/growth/notifications" 2>/dev/null || echo '{}')"

  check "GET /api/growth/notifications/unread-count → 200" '"success":true' \
    "$(curl -sf -H "Authorization: Bearer $TOKEN" "$BASE_URL/api/growth/notifications/unread-count" 2>/dev/null || echo '{}')"

  echo "--- Automation ---"

  check "GET /api/automation → 200" '"success":true' \
    "$(curl -sf -H "Authorization: Bearer $TOKEN" "$BASE_URL/api/automation" 2>/dev/null || echo '{}')"

  SEED_RESP=$(curl -sf -X POST -H "Authorization: Bearer $TOKEN" "$BASE_URL/api/automation/seed" 2>/dev/null || echo '{}')
  check "POST /api/automation/seed → seeded/already registered" '"message"' "$SEED_RESP"

  echo "--- Health check ---"

  HEALTH_RESP=$(curl -sf -H "Authorization: Bearer $TOKEN" "$BASE_URL/health" 2>/dev/null || echo '{}')
  check "GET /health → status present" '"status"' "$HEALTH_RESP"
fi

# ── Summary ───────────────────────────────────────────────────────────────────

echo ""
echo "=== Results: $PASS passed, $FAIL failed ==="
echo ""

if [ "$FAIL" -gt 0 ]; then
  exit 1
fi

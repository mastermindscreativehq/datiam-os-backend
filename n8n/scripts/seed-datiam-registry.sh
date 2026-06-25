#!/usr/bin/env bash
# seed-datiam-registry.sh — Seed DATIAM workflow registry via the backend API.
# Usage: ./n8n/scripts/seed-datiam-registry.sh [API_URL] [JWT_TOKEN]
#
# Obtains a token automatically if DATIAM_EMAIL / DATIAM_PASSWORD are set.

set -euo pipefail

API_URL="${1:-http://localhost:4000/api}"
JWT_TOKEN="${2:-}"

echo "=== DATIAM Workflow Registry Seeder ==="
echo "API : $API_URL"
echo ""

# Auto-login if no token provided
if [ -z "$JWT_TOKEN" ] && [ -n "${DATIAM_EMAIL:-}" ] && [ -n "${DATIAM_PASSWORD:-}" ]; then
  echo "Logging in as $DATIAM_EMAIL..."
  JWT_TOKEN=$(curl -sf \
    -X POST "$API_URL/auth/login" \
    -H "Content-Type: application/json" \
    -d "{\"email\":\"$DATIAM_EMAIL\",\"password\":\"$DATIAM_PASSWORD\"}" \
    | grep -o '"token":"[^"]*"' | cut -d'"' -f4)
  echo "Token obtained."
fi

if [ -z "$JWT_TOKEN" ]; then
  echo "ERROR: Provide JWT_TOKEN as arg 2, or set DATIAM_EMAIL and DATIAM_PASSWORD"
  exit 1
fi

echo "Seeding workflows..."
response=$(curl -sf \
  -X POST "$API_URL/automation/seed" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $JWT_TOKEN")

echo "Response: $response"
echo ""
echo "=== Seed complete ==="

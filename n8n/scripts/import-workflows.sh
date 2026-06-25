#!/usr/bin/env bash
# import-workflows.sh — Import DATIAM workflow templates into a running n8n instance.
# Usage: ./n8n/scripts/import-workflows.sh [N8N_BASE_URL] [N8N_USER] [N8N_PASS]
#
# Defaults (matching docker-compose.n8n.yml):
#   N8N_BASE_URL = http://localhost:5678
#   N8N_USER     = datiam
#   N8N_PASS     = datiam_local_dev

set -euo pipefail

N8N_URL="${1:-http://localhost:5678}"
N8N_USER="${2:-datiam}"
N8N_PASS="${3:-datiam_local_dev}"
AUTH="$N8N_USER:$N8N_PASS"
WORKFLOWS_DIR="$(cd "$(dirname "$0")/../workflows" && pwd)"

echo "=== DATIAM n8n Workflow Importer ==="
echo "Target : $N8N_URL"
echo "User   : $N8N_USER"
echo ""

# Wait for n8n to be healthy
echo "Waiting for n8n to be healthy..."
for i in $(seq 1 30); do
  if curl -sf "$N8N_URL/healthz" > /dev/null 2>&1; then
    echo "n8n is healthy."
    break
  fi
  if [ "$i" -eq 30 ]; then
    echo "ERROR: n8n did not become healthy within 30s"
    exit 1
  fi
  sleep 1
done

import_workflow() {
  local file="$1"
  local name
  name=$(basename "$file" .json)
  echo ""
  echo "Importing: $name"

  local response
  response=$(curl -sf \
    -X POST "$N8N_URL/api/v1/workflows" \
    -u "$AUTH" \
    -H "Content-Type: application/json" \
    -d "@$file" 2>&1) || {
    echo "  WARN: Import failed (workflow may already exist): $response"
    return 0
  }

  local wf_id
  wf_id=$(echo "$response" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
  echo "  OK — workflow ID: ${wf_id:-unknown}"

  # Activate the workflow
  if [ -n "$wf_id" ]; then
    curl -sf \
      -X PATCH "$N8N_URL/api/v1/workflows/$wf_id" \
      -u "$AUTH" \
      -H "Content-Type: application/json" \
      -d '{"active": true}' > /dev/null 2>&1 && echo "  Activated." || echo "  WARN: Could not activate"
  fi
}

for wf_file in "$WORKFLOWS_DIR"/*.template.json; do
  [ -f "$wf_file" ] && import_workflow "$wf_file"
done

echo ""
echo "=== Import complete ==="

#!/bin/bash

# Configuration from environment variables
MOCKSERVER_HOST="${MOCKSERVER_HOST:-localhost}"
MOCKSERVER_PORT="${MOCKSERVER_PORT:-1080}"
MOCKSERVER_URL="http://${MOCKSERVER_HOST}:${MOCKSERVER_PORT}"

echo "Using MockServer at: ${MOCKSERVER_URL}"
echo ""

echo "Clearing existing expectations..."
curl -s -X PUT "${MOCKSERVER_URL}/mockserver/clear" >/dev/null

echo "Registering expectations..."
for file in expectations/*.json; do
  echo "  → $file"
  curl -s -X PUT "${MOCKSERVER_URL}/mockserver/expectation" \
    -H "Content-Type: application/json; charset=utf-8" \
    -d @"$file" >/dev/null
  echo "     ✅ loaded"
done

echo "Validation:"
curl -s "${MOCKSERVER_URL}/mockserver/retrieve?type=ACTIVE_EXPECTATIONS" | jq .
echo "✅ Done"

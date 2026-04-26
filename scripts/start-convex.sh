#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
ENV_FILE="$ROOT_DIR/.env.local"

if [ ! -f "$ENV_FILE" ]; then
  echo "ERROR: $ENV_FILE not found. Cannot determine Convex ports." >&2
  exit 1
fi

CLOUD_PORT=$(grep '^CONVEX_URL=' "$ENV_FILE" | sed 's|.*://127.0.0.1:\([0-9]*\).*|\1|')
SITE_PORT=$(grep '^CONVEX_SITE_URL=' "$ENV_FILE" | sed 's|.*://127.0.0.1:\([0-9]*\).*|\1|')

if [ -z "$CLOUD_PORT" ] || [ -z "$SITE_PORT" ]; then
  echo "ERROR: Could not parse CONVEX_URL or CONVEX_SITE_URL from $ENV_FILE" >&2
  exit 1
fi

echo "Starting Convex local backend on ports ${CLOUD_PORT}/${SITE_PORT}"
exec pnpm exec convex dev \
  --configure existing \
  --team lee-moore \
  --project liminal-build \
  --dev-deployment local \
  --local-cloud-port "$CLOUD_PORT" \
  --local-site-port "$SITE_PORT" \
  "$@"

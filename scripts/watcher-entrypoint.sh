#!/bin/sh
# watcher-entrypoint.sh
# Starts the TypeScript package/plugin watchers inside the packages-watcher container.
# Runs as PID 1's child — uses exec on the final concurrently invocation so
# Docker signals are delivered directly to concurrently.
set -e

cd /app

# Phase 1: clear stale compiled output so the healthcheck cannot pass with
# artifacts from a previous host build (prevents false-positive healthcheck).
echo "[watcher] Clearing stale dist directories..."
rm -rf /app/packages/shared/dist /app/packages/sdk/dist

# Phase 2: install plugin dependencies.
# Plugins are not npm workspace members; each needs its own npm install so that
# file: path references (e.g. "file:../../packages/sdk") resolve correctly at build time.
echo "[watcher] Installing plugin dependencies..."
(cd /app/plugins/form/demo-form    && npm install)
(cd /app/plugins/storage/minio     && npm install)

# Phase 3: synchronous initial builds.
# Must complete before concurrently is exec'd so that healthcheck target files exist
# and dependent services (backend, frontend) can start.
echo "[watcher] Initial build: packages/shared + sdk..."
npx tsc --build /app/packages/sdk/tsconfig.json

echo "[watcher] Initial build: demo-form plugin..."
(cd /app/plugins/form/demo-form    && node_modules/.bin/moduul build) || true

echo "[watcher] Initial build: storage-minio plugin..."
(cd /app/plugins/storage/minio     && node_modules/.bin/moduul build --format cjs) || true

# Phase 4: fan out concurrent watch processes.
echo "[watcher] Starting watch processes..."
exec npx concurrently \
  --names "pkgs,demo-form,storage-minio" \
  --prefix "[{name}]" \
  --prefix-colors "cyan,yellow,blue" \
  --timestamp-format "HH:mm:ss" \
  --kill-others-on-fail false \
  "npx tsc --build /app/packages/sdk/tsconfig.json --watch --preserveWatchOutput" \
  "npx nodemon --legacy-watch --watch /app/plugins/form/demo-form/src --ext ts,json --delay 1 --exec 'cd /app/plugins/form/demo-form && node_modules/.bin/moduul build || true'" \
  "npx nodemon --legacy-watch --watch /app/plugins/storage/minio/src --ext ts,json --delay 1 --exec 'cd /app/plugins/storage/minio && node_modules/.bin/moduul build --format cjs || true'"

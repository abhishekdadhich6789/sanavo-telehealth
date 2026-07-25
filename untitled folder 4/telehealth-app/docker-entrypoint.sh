#!/bin/sh
set -e

mkdir -p /app/data

echo "[sanavo] Applying database schema..."
./node_modules/.bin/prisma db push --accept-data-loss

echo "[sanavo] Starting Sanavo on port ${PORT:-3000}..."
exec node server.js

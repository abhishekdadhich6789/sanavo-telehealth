#!/bin/sh
set -e

mkdir -p /app/data

echo "[sanavo] Applying database schema..."
npx prisma db push --skip-generate

echo "[sanavo] Starting Sanavo on port ${PORT:-3000}..."
exec node server.js

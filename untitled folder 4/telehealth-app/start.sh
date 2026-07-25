#!/bin/sh
set -e

echo "[sanavo] ========================================"
echo "[sanavo] Starting Sanavo"
echo "[sanavo] NODE_ENV=${NODE_ENV:-unset}"
echo "[sanavo] PORT=${PORT:-3000}"
echo "[sanavo] DATABASE_URL=${DATABASE_URL:-MISSING}"
echo "[sanavo] JWT_SECRET set: $([ -n "$JWT_SECRET" ] && echo yes || echo NO)"
echo "[sanavo] PASSWORD_PEPPER set: $([ -n "$PASSWORD_PEPPER" ] && echo yes || echo NO)"
echo "[sanavo] NEXT_PUBLIC_APP_URL=${NEXT_PUBLIC_APP_URL:-unset}"
echo "[sanavo] ========================================"

if [ -z "$JWT_SECRET" ] || [ ${#JWT_SECRET} -lt 32 ]; then
  echo "[sanavo] ERROR: JWT_SECRET must be set (32+ chars) in Railway Variables"
  exit 1
fi

if [ -z "$PASSWORD_PEPPER" ] || [ ${#PASSWORD_PEPPER} -lt 16 ]; then
  echo "[sanavo] ERROR: PASSWORD_PEPPER must be set (16+ chars) in Railway Variables"
  exit 1
fi

mkdir -p /data
echo "[sanavo] /data ready"

echo "[sanavo] Running prisma db push..."
npx prisma db push --accept-data-loss
echo "[sanavo] Database schema ready"

echo "[sanavo] Starting Next.js on 0.0.0.0:${PORT:-3000}..."
exec npx next start -H 0.0.0.0 -p "${PORT:-3000}"

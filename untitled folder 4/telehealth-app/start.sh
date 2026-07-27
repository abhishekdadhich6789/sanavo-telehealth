#!/bin/sh
# Do NOT use `set -e` — we want Next.js to start even if prisma fails.
# Flush logs immediately so Railway captures them.
exec 1>&1 2>&2

echo "[sanavo] ========================================"
echo "[sanavo] boot $(date -u +%Y-%m-%dT%H:%M:%SZ)"
echo "[sanavo] cwd=$(pwd) user=$(id -u) port=${PORT:-3000}"
echo "[sanavo] DATABASE_URL=${DATABASE_URL:-MISSING}"
echo "[sanavo] JWT_SECRET set: $([ -n "$JWT_SECRET" ] && echo yes || echo NO)"
echo "[sanavo] PASSWORD_PEPPER set: $([ -n "$PASSWORD_PEPPER" ] && echo yes || echo NO)"
echo "[sanavo] NEXT_PUBLIC_APP_URL=${NEXT_PUBLIC_APP_URL:-unset}"
echo "[sanavo] ========================================"

# Defaults so the process can bind even if Variables are incomplete
export DATABASE_URL="${DATABASE_URL:-file:/data/sanavo.db}"
export PORT="${PORT:-3000}"
export HOSTNAME="${HOSTNAME:-0.0.0.0}"

if [ -z "$JWT_SECRET" ] || [ "${#JWT_SECRET}" -lt 32 ]; then
  echo "[sanavo] WARN: JWT_SECRET missing/short — login will fail until set in Variables"
fi
if [ -z "$PASSWORD_PEPPER" ] || [ "${#PASSWORD_PEPPER}" -lt 16 ]; then
  echo "[sanavo] WARN: PASSWORD_PEPPER missing/short — password hashing will fail until set"
fi

mkdir -p /data || mkdir -p ./data || true
echo "[sanavo] data dir ready"

echo "[sanavo] prisma db push (45s timeout)..."
if command -v timeout >/dev/null 2>&1; then
  timeout 45 npx prisma db push --accept-data-loss \
    || echo "[sanavo] WARN: prisma db push failed or timed out — starting app anyway"
else
  npx prisma db push --accept-data-loss \
    || echo "[sanavo] WARN: prisma db push failed — starting app anyway"
fi

echo "[sanavo] binding Next.js on ${HOSTNAME}:${PORT}"
# Use node directly on next binary for clearer crashes
if [ -f ./node_modules/next/dist/bin/next ]; then
  exec ./node_modules/next/dist/bin/next start -H "$HOSTNAME" -p "$PORT"
fi
exec npx next start -H "$HOSTNAME" -p "$PORT"

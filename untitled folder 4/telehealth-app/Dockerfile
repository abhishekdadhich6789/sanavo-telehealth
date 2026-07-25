# Railway-compatible Dockerfile (NO docker VOLUME — use Railway Volumes UI instead)
FROM node:22-bookworm-slim
WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 make g++ openssl ca-certificates \
    && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

ENV NEXT_TELEMETRY_DISABLED=1
ENV DATABASE_URL="file:./data/build.db"
ENV JWT_SECRET="build-time-jwt-secret-placeholder-32chars-min"
ENV PASSWORD_PEPPER="build-time-pepper-placeholder"

RUN mkdir -p /app/data \
  && npx prisma generate \
  && npm run build

ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
# Match this path to a Railway Volume mount: /data
ENV DATABASE_URL="file:/data/sanavo.db"

EXPOSE 3000

# Persist DB via Railway Volume mounted at /data (Settings → Volumes)
CMD ["sh", "-c", "mkdir -p /data && npx prisma db push --accept-data-loss && npx next start -H 0.0.0.0 -p ${PORT:-3000}"]

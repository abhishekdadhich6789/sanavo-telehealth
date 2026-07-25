# Railway-compatible Dockerfile (NO docker VOLUME — mount Railway Volume at /data)
FROM node:22-bookworm-slim
WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 make g++ openssl ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# package manifests + prisma schema BEFORE npm ci
# (postinstall runs `prisma generate` and needs the schema)
COPY package.json package-lock.json ./
COPY prisma ./prisma
COPY prisma.config.ts ./prisma.config.ts

ENV DATABASE_URL="file:./data/build.db"
RUN npm ci

COPY . .

ENV NEXT_TELEMETRY_DISABLED=1
ENV JWT_SECRET="build-time-jwt-secret-placeholder-32chars-min"
ENV PASSWORD_PEPPER="build-time-pepper-placeholder"

RUN mkdir -p /app/data /data \
  && npx prisma generate \
  && npm run build

ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
# Match Railway Volume mount path: /data
ENV DATABASE_URL="file:/data/sanavo.db"

EXPOSE 3000

CMD ["sh", "-c", "mkdir -p /data && npx prisma db push --accept-data-loss && npx next start -H 0.0.0.0 -p ${PORT:-3000}"]

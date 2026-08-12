# syntax=docker/dockerfile:1

# ---- Stage 1: build the React frontend -------------------------------------
# Node 18 reached end of life in April 2025 and no longer receives security
# patches.
FROM node:22-alpine AS frontend-builder
WORKDIR /app/client

# npm ci installs exactly what the lockfile specifies and fails if the lockfile
# is out of sync — npm install would silently drift.
COPY client/package.json client/package-lock.json ./
RUN npm ci

COPY client/ ./
RUN npm run build

# ---- Stage 2: backend runtime ----------------------------------------------
FROM node:22-alpine
WORKDIR /app

ENV NODE_ENV=production

# dumb-init reaps zombies and forwards SIGTERM to node, so the graceful
# shutdown handler in server.js actually fires on container stop.
RUN apk add --no-cache dumb-init

COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

COPY backend/ ./backend/
COPY server.js ./
COPY --from=frontend-builder /app/client/dist ./client/dist

# KYC documents. Mount a volume here — the container filesystem is ephemeral,
# so without one every redeploy destroys identity documents that have already
# been reviewed, while kycStatus stays 'verified' in the database.
RUN mkdir -p /app/uploads && chown -R node:node /app
VOLUME ["/app/uploads"]

# Drop root. The original image ran the whole application as uid 0.
USER node

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD node -e "require('http').get('http://127.0.0.1:3000/api/health',r=>process.exit(r.statusCode===200?0:1)).on('error',()=>process.exit(1))"

ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "server.js"]

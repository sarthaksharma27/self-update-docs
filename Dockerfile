FROM node:22.12.0-slim AS base
RUN apt-get update && apt-get install -y --no-install-recommends \
    dumb-init \
    openssl \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*
WORKDIR /app

FROM base AS deps
COPY package*.json ./
COPY prisma ./prisma/
RUN --mount=type=cache,target=/root/.npm \
    npm ci
RUN npx prisma generate

FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build
RUN npm prune --production

FROM base AS release
ENV NODE_ENV=production
WORKDIR /app
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma
# Added the config file required by Prisma 7
COPY --from=builder /app/prisma.config.ts ./prisma.config.ts 
COPY package*.json ./

USER node

EXPOSE 8000
ENTRYPOINT ["/usr/bin/dumb-init", "--"]
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/index.js"]
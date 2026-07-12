FROM node:20-alpine AS builder

# Install pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

# Set working directory
WORKDIR /app

# Install system dependencies required for our Git server
RUN apk add --no-cache git tar

# Copy workspace configuration
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json ./

# Copy API package.json
COPY apps/api/package.json apps/api/

# Install dependencies (only what's needed for the API, filtering out the frontend if possible, but simplest is to install all or just api deps)
RUN pnpm install --filter @pisahub/api...

# Copy source code
COPY apps/api apps/api

# Build API
WORKDIR /app/apps/api
RUN pnpm run db:generate
RUN pnpm run build

# Start production image
FROM node:20-alpine

RUN corepack enable && corepack prepare pnpm@latest --activate
RUN apk add --no-cache git tar

WORKDIR /app

COPY --from=builder /app/package.json /app/pnpm-lock.yaml /app/pnpm-workspace.yaml ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/apps/api/package.json ./apps/api/
COPY --from=builder /app/apps/api/node_modules ./apps/api/node_modules
COPY --from=builder /app/apps/api/dist ./apps/api/dist
COPY --from=builder /app/apps/api/prisma ./apps/api/prisma

WORKDIR /app/apps/api

# Ensure repositories folder exists
RUN mkdir -p /app/repos

ENV NODE_ENV=production
ENV PORT=4000
ENV GIT_REPOS_PATH=/app/repos

EXPOSE 4000

# Run migrations and start the server
CMD ["sh", "-c", "pnpm run db:push && node dist/index.js"]

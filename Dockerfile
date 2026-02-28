# syntax=docker/dockerfile:1.7
ARG NODE_VERSION=22
FROM node:${NODE_VERSION}-alpine AS base

WORKDIR /app

# Layer A: root workspace manifests
COPY package.json package-lock.json ./

# Layer B: workspace member manifests (ONLY workspace members - NOT plugins)
COPY apps/backend/package.json   apps/backend/package.json
COPY apps/frontend/package.json  apps/frontend/package.json
COPY packages/shared/package.json packages/shared/package.json
COPY packages/sdk/package.json    packages/sdk/package.json

# Layer C: npm install with BuildKit cache mount
RUN --mount=type=cache,id=formrig-npm,sharing=locked,target=/root/.npm \
    npm ci --ignore-scripts

# Layer D: full source
COPY . .

# ─── packages-watcher ───
FROM base AS packages-watcher
RUN npm install -g nodemon
COPY scripts/watcher-entrypoint.sh /usr/local/bin/watcher-entrypoint.sh
RUN chmod +x /usr/local/bin/watcher-entrypoint.sh
CMD ["/usr/local/bin/watcher-entrypoint.sh"]

# ─── backend-dev ───
FROM base AS backend-dev
WORKDIR /app/apps/backend
EXPOSE 3000
CMD ["/app/node_modules/.bin/nest", "start", "--watch"]

# ─── frontend-dev ───
FROM base AS frontend-dev
WORKDIR /app/apps/frontend
EXPOSE 4200
CMD ["/app/node_modules/.bin/ng", "serve", "--host", "0.0.0.0", "--poll", "500"]

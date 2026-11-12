# Built from the repository root: docker build -f apps/api/Dockerfile .

# Builds the workspace and writes the API's production package to /out with
# pnpm deploy: its built code and only its production dependencies.
FROM node:24.18.0-alpine AS build
RUN corepack enable
WORKDIR /repo
COPY . .
RUN pnpm install --frozen-lockfile --ignore-scripts
RUN pnpm --filter @fpr/api... run build
RUN pnpm --filter @fpr/api deploy --prod --legacy --ignore-scripts /out

# The runtime image holds the production package and nothing else.
FROM node:24.18.0-alpine AS runtime
ENV NODE_ENV=production
WORKDIR /app
COPY --from=build --chown=node:node /out ./
USER node
EXPOSE 3000
HEALTHCHECK --interval=10s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -q -O /dev/null "http://127.0.0.1:${PORT:-3000}/health" || exit 1
CMD ["node", "dist/index.js"]

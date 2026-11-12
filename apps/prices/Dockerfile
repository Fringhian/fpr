# Built from the repository root: docker build -f apps/prices/Dockerfile .

FROM node:24.18.0-alpine AS build
RUN corepack enable
WORKDIR /repo
COPY . .
# Scripts stay off: the repository's prepare script installs Git hooks, and
# the image has no Git metadata.
RUN pnpm install --frozen-lockfile --ignore-scripts --filter @fpr/prices...
RUN pnpm --filter "@fpr/prices..." run build
RUN pnpm deploy --legacy --ignore-scripts --filter @fpr/prices --prod /deploy

FROM node:24.18.0-alpine AS runtime
ENV NODE_ENV=production \
    PORT=3000
WORKDIR /app
COPY --from=build /deploy/package.json ./package.json
COPY --from=build /deploy/node_modules ./node_modules
COPY --from=build /deploy/dist ./dist
USER node
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD ["node", "-e", "fetch(`http://127.0.0.1:${process.env.PORT}/health`).then((response) => process.exit(response.ok ? 0 : 1), () => process.exit(1))"]
CMD ["node", "dist/index.js"]

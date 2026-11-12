# Build from the repository root: docker build -f apps/web/Dockerfile .

FROM node:24.15.0-alpine AS build
RUN corepack enable
WORKDIR /repo
COPY . .
RUN pnpm install --frozen-lockfile --ignore-scripts --filter @fpr/web...
RUN pnpm --filter @fpr/web run build

FROM nginx:1.29.8-alpine
COPY apps/web/nginx.conf /etc/nginx/nginx.conf
COPY --from=build /repo/apps/web/dist /srv
RUN nginx -t

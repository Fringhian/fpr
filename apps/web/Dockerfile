# Build from the repository root: docker build -f apps/web/Dockerfile .

FROM node:24.15.0-alpine AS build
RUN corepack enable
WORKDIR /repo
COPY . .
RUN pnpm install --frozen-lockfile --ignore-scripts --filter @fpr/web...
RUN pnpm --filter @fpr/web run build

FROM nginx:1.29.8-alpine
# The header the host's reverse proxy carries the client's address in. The image's entrypoint
# writes conf.d/client-ip.conf from the template with it at each start; the build writes the
# default so the configuration is tested.
ENV CLIENT_IP_HEADER=X-Forwarded-For
COPY apps/web/nginx.conf /etc/nginx/nginx.conf
COPY apps/web/client-ip.conf.template /etc/nginx/templates/client-ip.conf.template
COPY --from=build /repo/apps/web/dist /srv
RUN envsubst '$CLIENT_IP_HEADER' < /etc/nginx/templates/client-ip.conf.template > /etc/nginx/conf.d/client-ip.conf \
	&& nginx -t

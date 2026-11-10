# Deployment

FPR runs as three Docker images, Postgres, and S3-compatible storage. Any host that runs Docker Compose runs it. All configuration comes from environment variables.

## Services

| Service        | Image                                           | Exposed                   |
| -------------- | ----------------------------------------------- | ------------------------- |
| `web`          | `apps/web/Dockerfile`: Caddy with the built app | Yes, the only public port |
| `api`          | `apps/api/Dockerfile`                           | No                        |
| `prices`       | `apps/prices/Dockerfile`                        | No                        |
| `postgres`     | `postgres:18`                                   | No                        |
| `minio`        | `minio/minio`, in the `storage` profile         | No                        |
| `victorialogs` | `victoriametrics/victoria-logs`                 | Yes, on its own hostname  |
| `vector`       | `timberio/vector`                               | No                        |

`web` forwards `/api` to `api`. `api` calls `prices`. `web` and `victorialogs` each need a hostname, and TLS is the host's reverse proxy's job.

The `minio` service is for instances without external object storage: `docker compose --profile storage up`. With an external bucket (Cloudflare R2, AWS S3, or any S3-compatible service), the `S3_*` variables point at it and the profile stays off.

## Self-hosting

1. Clone the repository.
2. Copy `.env.example` to `.env` and fill it in. The secrets are long random strings.
3. Run `docker compose up -d`, with `--profile storage` for local object storage.
4. Open `<PUBLIC_URL>/setup` and create the first admin with `ADMIN_BOOTSTRAP_KEY`.

`.env.example` lists every variable without values. The variables each app reads are listed in `api.md` and `prices.md`.

## Logs

Every container writes its logs to standard output. `vector` reads them through the Docker socket, mounted read-only, and sends them to `victorialogs`, which stores them on its own volume.

- Each line is stored with its service, container, time, and JSON fields, so a search can filter on any of them: a level, a request id, a person's id, a share.
- Logs are kept for `LOGS_RETENTION`, by default 100 years. When the volume reaches `LOGS_MAX_DISK`, the oldest days are deleted first.
- A deploy replaces the containers, not the logs volume: every log stays searchable across deploys.
- The search interface is VictoriaLogs' own web UI, on its own hostname. FPR's sign-in has no part in it: VictoriaLogs asks for its own username and password, `LOGS_USERNAME` and `LOGS_PASSWORD`. The host's access proxy, such as Cloudflare Access, can add a second login in front of it.
- `victorialogs` and `vector` share a Docker network of their own. `web`, `api`, and `prices` can't reach them.

| Variable                         | Purpose                                      |
| -------------------------------- | -------------------------------------------- |
| `LOGS_RETENTION`                 | How long logs are kept. Default `100y`       |
| `LOGS_MAX_DISK`                  | The logs volume's size limit. Default `20GB` |
| `LOGS_USERNAME`, `LOGS_PASSWORD` | The search interface's login                 |

## Migrations

The API image runs pending migrations before starting the server. A failed migration stops the container, and the previous version keeps running on hosts that replace containers only when the new one is healthy. `prices` starts after `api` is healthy.

Every migration stays compatible with the running code: additions ship first, and removals ship in a later release.

## Health

`api` and `prices` answer `GET /health` with `200` once connected to Postgres. Compose's health checks use it.

## Backups

Postgres holds all of FPR's data, the bucket holds the profile pictures, and the `victorialogs` volume holds the logs. Backing up an instance means dumping Postgres with `pg_dump`, copying the bucket, and copying the logs volume.

## Development

- `docker compose --profile storage up postgres minio victorialogs vector` runs the dependencies.
- `pnpm install` installs the Git hooks.
- `pnpm dev` runs `web`, `api`, and `prices` in watch mode, with `api` and `prices` on `tsx`.
- `pnpm dev:mock` runs `web` alone, on mock responses built from the contracts.
- `pnpm db:migrate` runs migrations against `DATABASE_URL`.
- `pnpm db:seed` fills a development database with invented people holding manual shares and a few widely traded listings.
- Development uses the real provider, with its own `PRICE_PROVIDER_API_KEY`, so it never spends the live instance's daily calls.

## CI

GitHub Actions runs on every pull request and every push to `main`: install, `biome ci`, typecheck, a check that `openapi.json` matches the contracts, Vitest, build, a Storybook build with its accessibility checks, and a Docker build of each app. Tests that touch the database run against a Postgres service container, migrated from scratch, with the provider's and Frankfurter's HTTP calls mocked. A pull request merges only when CI passes.

## Deploy

A push to `main` deploys only once CI has passed on it. The last CI job calls the host's deploy webhook, with the URL and token stored as GitHub Actions secrets, `DEPLOY_WEBHOOK_URL` and `DEPLOY_TOKEN`. When the host sits behind an access proxy, `DEPLOY_EXTRA_HEADERS` adds its credentials. Without these secrets, as on a fork, the deploy job is skipped.

## Coolify

On Coolify, FPR is one Docker Compose resource built from the repository's `compose.yaml`. The FPR domain is set on the `web` service and the logs domain on the `victorialogs` service, and the variables are set in the resource's environment. Coolify's own deploy-on-push is off: CI triggers each deploy through the resource's deploy webhook, with a deploy-only Coolify token.

# Deployment

FPR runs as three Docker images, Postgres, and S3-compatible storage. Any host that runs Docker Compose runs it. All configuration comes from environment variables.

## Services

| Service | Image | Published port |
| --- | --- | --- |
| `web` | `apps/web/Dockerfile`: nginx with the built app | `WEB_PORT`, default `8081`, on the loopback address |
| `api` | `apps/api/Dockerfile` | None |
| `prices` | `apps/prices/Dockerfile` | None |
| `postgres` | `postgres:18` | None |
| `rustfs` | `rustfs/rustfs`, in the `storage` profile | None |
| `victorialogs` | `victoriametrics/victoria-logs` | `LOGS_PORT`, default `9428`, on the loopback address |
| `vector` | `deploy/vector.Dockerfile`: `timberio/vector` with `deploy/vector.yaml` | None |
| `backup` | `deploy/backup.Dockerfile`: Postgres 18's client tools, rclone, and supercronic, with `deploy/backup/` | None |

Every image is pinned to an exact version, in `compose.yaml` or in the Dockerfile that builds on it.

`web` forwards `/api` to `api`, and `api` calls `prices`. `web` and `victorialogs` each need a hostname. The host's reverse proxy forwards each to its loopback port and handles TLS: it redirects HTTP to HTTPS and sends `Strict-Transport-Security`. `web` sends the other security headers itself (`web.md` › Serving).

`web` reads each client's address from `CLIENT_IP_HEADER`, a header the edge proxy always sets, and the API's rate limits are kept per that address (`auth.md` › Client address). The default, `X-Forwarded-For`, fits a reverse proxy that faces the internet itself. Behind Cloudflare, Cloudflare Tunnel included, it is `CF-Connecting-IP`. After a deploy, a request from a known address shows that address as `remote_addr` in `web`'s log.

`rustfs` is S3-compatible storage for instances without external object storage: `docker compose --profile storage up`. It takes its credentials from `S3_ACCESS_KEY_ID` and `S3_SECRET_ACCESS_KEY`, and the one-off `rustfs-bucket` container, in the same profile, creates `S3_BUCKET` when it is missing. With an external bucket (Cloudflare R2, AWS S3, or any S3-compatible service), the `S3_*` variables point at it and the profile stays off.

| Variable | Purpose |
| --- | --- |
| `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB` | The `postgres` service's user, password, and database, which `DATABASE_URL` points at |
| `WEB_PORT`, `LOGS_PORT` | The loopback ports of `web` and `victorialogs`. Default `8081` and `9428` |
| `CLIENT_IP_HEADER` | The header `web` reads the client's address from, on requests from the loopback address and private networks. Default `X-Forwarded-For` |

## Self-hosting

1. Clone the repository.
2. Copy `.env.example` to `.env` and fill it in. The secrets are long random strings.
3. Run `docker compose up -d`, with `--profile storage` for local object storage.
4. Open `<PUBLIC_URL>/setup` and create the first admin with `ADMIN_BOOTSTRAP_KEY`.

`.env.example` lists every variable. The variables each app reads are listed in `api.md` and `prices.md`.

## Logs

Every container writes its logs to standard output. `vector` reads them through the Docker socket, mounted read-only, from the containers labelled `fpr.logs`, and sends them to `victorialogs`, which stores them on its own volume. `vector`'s configuration, `deploy/vector.yaml`, is built into its image; in development, `compose.dev.yaml` mounts the working copy's file over it.

- Each line is stored with its service, container, time, and JSON fields, so a search can filter on any of them: a level, a request id, a person's id, a share.
- Logs are kept for `LOGS_RETENTION`. When the volume reaches `LOGS_MAX_DISK`, the oldest days are deleted first. A deploy replaces the containers, not the volume, so logs stay searchable across deploys.
- The search interface is VictoriaLogs' own web UI, on its own hostname, behind its own login, `LOGS_USERNAME` and `LOGS_PASSWORD`. FPR's sign-in has no part in it. An access proxy, such as Cloudflare Access, can add a second login in front of it.
- `victorialogs` and `vector` share a Docker network of their own, which `web`, `api`, and `prices` can't reach under plain Docker Compose.

| Variable | Purpose |
| --- | --- |
| `LOGS_RETENTION` | How long logs are kept. Default `100y` |
| `LOGS_MAX_DISK` | The logs volume's size limit. Default `20GB` |
| `LOGS_USERNAME`, `LOGS_PASSWORD` | The search interface's login |

## Migrations

The API image runs pending migrations before starting the server (`database.md`). A failed migration stops the container, and the previous version keeps running on hosts that replace containers only when the new one is healthy. `prices` starts after `api` is healthy.

## Health

`api` and `prices` answer `GET /health` with `200` once connected to Postgres, and `503` otherwise. Each image's Docker health check calls it.

## Backups

Postgres holds all of FPR's data, the bucket holds the profile pictures, and the `victorialogs` volume holds the logs. The `backup` service copies all three to a backup bucket, an S3-compatible bucket off the host with its own key, on `BACKUP_SCHEDULE`. While `BACKUP_S3_BUCKET` is empty, backups are off: the service logs a warning and idles.

Each run writes, in the backup bucket:

| Key | Content |
| --- | --- |
| `postgres/fpr-<time>.dump` | The database, as a `pg_dump` custom-format file |
| `pictures/current/` | A copy of the pictures bucket |
| `logs/current/` | A copy of the `victorialogs` volume, mounted read-only |
| `pictures/replaced/<time>/`, `logs/replaced/<time>/` | The files the run deleted or overwrote in each copy |

`<time>` is the run's UTC time, `YYYYMMDDTHHMMSSZ`. After a run whose every step succeeded, the dumps and `replaced` folders older than `BACKUP_RETENTION_DAYS` are deleted; a failed run deletes nothing. A run logs each step, and a failed step logs at `error` with its output, followed by `Backup failed`. `docker compose exec backup fpr-backup` runs one at once.

| Variable | Purpose |
| --- | --- |
| `BACKUP_SCHEDULE` | When runs start, a cron expression in UTC. Default `0 3 * * *` |
| `BACKUP_RETENTION_DAYS` | How long dumps and replaced files are kept. Default `30` |
| `BACKUP_S3_ENDPOINT`, `BACKUP_S3_REGION`, `BACKUP_S3_BUCKET`, `BACKUP_S3_ACCESS_KEY_ID`, `BACKUP_S3_SECRET_ACCESS_KEY` | The backup bucket and its key |

Restoring into a fresh instance, with the backup variables set:

1. `docker compose run --rm backup fpr-restore database` restores the latest dump, or the one named after it from `fpr-restore list`, into the new, empty database. It refuses a database that already has tables, so it runs before `api` has migrated one.
2. `docker compose run --rm backup fpr-restore pictures` copies the pictures into `S3_BUCKET`.
3. For the logs, with `victorialogs` stopped: `docker compose run --rm --user root -v <logs volume>:/restore backup fpr-restore logs /restore`, where `<logs volume>` is the volume `docker volume ls` lists ending in `victorialogs-data`.
4. `docker compose up -d` starts the instance.

## Development

- `pnpm install` installs the dependencies and the Git hooks.
- `pnpm dev:deps` runs `postgres`, `rustfs`, `victorialogs`, and `vector` in the background, then creates the bucket. It adds `compose.dev.yaml`, which publishes Postgres on `localhost:5432` and RustFS on `localhost:9000`, on the loopback address only. VictoriaLogs is on `localhost:9428`, its loopback port. `docker compose --profile storage down` stops them.
- `pnpm dev` runs `web`, `api`, and `prices` in watch mode, reading the root `.env`. `web` listens on `5173`, `api` on `PORT` (default `3000`), and `prices` on `3001`.
- `pnpm db:migrate` runs migrations against `DATABASE_URL`, with the API image's entry point, `apps/api/src/migrate.ts`.
- `pnpm db:seed` runs pending migrations, then fills an empty development database with an invented race over about eight months, in one transaction: an admin, four members, a member whose link waits for first use, a guest, and an anonymous viewer; five widely traded listings with invented daily closes and two invented manual shares; share changes and cash balances. Every password user signs in with `development password`, and the script prints the anonymous viewer's and the waiting member's links. It refuses a database that already has people, and refuses to run when `NODE_ENV` is `production`.
- `pnpm test` needs Postgres: tests that touch the database create their own databases on the server at `DATABASE_URL`, read from the environment or else from the root `.env`.
- Development uses the real provider with its own `PRICE_PROVIDER_API_KEY`, so it never spends a live instance's daily calls.

## CI

GitHub Actions runs on every pull request and every push to `main`: install, `biome ci`, typecheck, a check that `openapi.json` matches the contracts, `pnpm db:migrate` on a `postgres:18` service container, Vitest, build, a Storybook build with its accessibility checks, and a Docker build of each app and of the backup image. Tests never reach the network: the provider's and Frankfurter's HTTP calls are mocked. A pull request merges only when CI passes.

## Deploy

A push to `main` deploys once CI has passed on it. The last CI job calls the host's deploy webhook, with the URL and token stored as GitHub Actions secrets, `DEPLOY_WEBHOOK_URL` and `DEPLOY_TOKEN`. When the host sits behind an access proxy, `DEPLOY_EXTRA_HEADERS` adds its credentials. Without these secrets, as on a fork, the deploy job is skipped.

## Coolify

On Coolify, FPR is one Docker Compose resource built from the repository's `compose.yaml`.

- The instance's domain is set on the `web` service, and the logs domain on `victorialogs`, with the internal port `9428`.
- The variables are set in the resource's environment, with `CLIENT_IP_HEADER=CF-Connecting-IP` when Cloudflare is in front.
- Coolify's proxy holds port `8080` on the host, so `WEB_PORT` stays at its default, `8081`.
- Coolify joins every service to the resource's network, so there `web`, `api`, and `prices` can reach `victorialogs`, which still asks for its login.
- Coolify's own deploy-on-push is off: CI triggers each deploy through the resource's deploy webhook, with a deploy-only Coolify token.

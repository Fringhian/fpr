# FPR

A share-portfolio leaderboard for a small group. Each member records the shares and cash they hold, and FPR ranks everyone on shared leaderboards and a race chart, valued at market prices refreshed every 30 minutes during the trading day.

FPR is self-hosted: one Docker Compose stack with Postgres and S3-compatible storage. Every instance-specific value comes from environment variables. It installs on phones and computers as a Progressive Web App.

## Status

FPR is being specified. The documentation describes the first version; the code comes next.

## Development

FPR runs on Node 24 with pnpm, and its dependencies run in Docker.

1. Install the packages. This also installs the git hooks.

   ```sh
   pnpm install
   ```

2. Copy `.env.example` to `.env` and fill it in. For development:

   | Variable | Value |
   | --- | --- |
   | `POSTGRES_USER`, `POSTGRES_DB` | `fpr` |
   | `POSTGRES_PASSWORD` | Any password |
   | `DATABASE_URL` | `postgres://fpr:<POSTGRES_PASSWORD>@localhost:5432/fpr` |
   | `PUBLIC_URL` | `http://localhost:5173` |
   | `PRICES_URL` | `http://localhost:3001` |
   | `S3_ENDPOINT` | `http://localhost:9000` |
   | `S3_REGION` | `us-east-1` |
   | `S3_BUCKET` | `fpr-avatars` |
   | `S3_ACCESS_KEY_ID` | Any name |
   | `PRICE_PROVIDER` | `eodhd` |
   | `PRICE_PROVIDER_API_KEY` | Your own key at the provider, not the live instance's |
   | `LOGS_USERNAME` | Any name |
   | `PRICES_TOKEN`, `BETTER_AUTH_SECRET`, `ADMIN_BOOTSTRAP_KEY`, `PSEUDONYM_SECRET`, `S3_SECRET_ACCESS_KEY`, `LOGS_PASSWORD` | `openssl rand -hex 32`, one each |

   The other variables have defaults and can stay empty.

3. Start Postgres, the object storage, and the logs in the background. This creates the bucket too.

   ```sh
   pnpm dev:deps
   ```

4. Create the database's tables.

   ```sh
   pnpm db:migrate
   ```

5. Run the web app, the API, and the price service in watch mode.

   ```sh
   pnpm dev
   ```

   The app is on http://localhost:5173. The API answers `http://localhost:3000/health` and the price service `http://localhost:3001/health` with `200` once Postgres answers. The logs of the Docker services are searchable at http://localhost:9428/select/vmui, with `LOGS_USERNAME` and `LOGS_PASSWORD`.

`docker compose --profile storage down` stops the dependencies, and keeps their data.

Before each commit, Biome formats the staged files and blocks the commit on any lint error. Before each push, Biome checks the whole repository and blocks the push on any error.

- `pnpm lint` checks the repository with Biome.
- `pnpm format` formats it and applies safe fixes.
- `pnpm test` runs every test, and `pnpm typecheck` checks the types. Tests that touch the database need `pnpm dev:deps` running.
- `pnpm db:migrate` applies the migrations a pull brings in.
- `pnpm storybook` opens Storybook on http://localhost:6006. `pnpm --filter @fpr/web test-storybook` runs every story in Chromium with its accessibility checks, after `pnpm --filter @fpr/web exec playwright install chromium`.

## Documentation

| | |
| --- | --- |
| [Overview](docs/architecture/overview.md) | The blocks, the stack, and the repository layout |
| [User stories](docs/product/user-stories.md) | What people do in FPR, with every case to cover |
| [User flows](docs/product/user-flows.md) | Every path through FPR, drawn |
| [Web](docs/architecture/web.md) | The app: screens, navigation, languages, installation |
| [API](docs/architecture/api.md) | Routes, race calculation, anonymization |
| [Price service](docs/architecture/prices.md) | Where prices come from, and when |
| [Database](docs/architecture/database.md) | Tables, keys, indexes, valuation |
| [Auth](docs/architecture/auth.md) | Roles, access links, sign-in |
| [Deployment](docs/architecture/deployment.md) | Services, self-hosting, logs, CI |

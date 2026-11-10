# FPR

A share-portfolio leaderboard for a small group. Each member records the shares and cash they hold, and FPR ranks everyone on shared leaderboards and a race chart, valued at market prices refreshed every 30 minutes during the trading day.

FPR is self-hosted: one Docker Compose stack with Postgres and S3-compatible storage. Every instance-specific value comes from environment variables. It installs on phones and computers as a Progressive Web App.

## Status

FPR is being specified. The documentation describes the first version; the code comes next.

## Development

FPR runs on Node 24 with pnpm.

```sh
pnpm install
```

`pnpm install` also installs the git hooks. Before each commit, Biome formats the staged files and blocks the commit on any lint error. Before each push, Biome checks the whole repository and blocks the push on any error.

- `pnpm lint` checks the repository with Biome.
- `pnpm format` formats it and applies safe fixes.

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

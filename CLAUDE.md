# FPR

A share-portfolio leaderboard. Each member records the shares they hold, and the app ranks everyone on shared leaderboards and lets members compare their progress with each other.

FPR is a generic, self-hostable tool: anyone can clone it and deploy it on their own infrastructure. Everything instance-specific (domain, credentials, storage) comes from configuration, never from code.

## No real data in the repository

This repository is public. No tracked file, commit message, or ticket names the people who use an instance or the shares they hold. Examples, fixtures, and seed data use invented names and generic instruments.

## Users and access

- **Admin**: adds people and manages their access. Also a member.
- **Member**: records their own portfolio and sees everyone's. There are no friendships or groups: every member sees every other member.
- **Guest**: sees the same data as members, read-only, with no portfolio.
- **Anonymous**: read-only, signs in with their access link alone, and sees anonymized data across the app, the admin area included.
- Nobody signs up. The admin adds each person and sends them an access link. The link's key is that person's access: revoking it cuts them off.

Roles and access: `docs/architecture/auth.md`. Every flow case: `docs/product/user-stories.md`, drawn in `docs/product/user-flows.md`.

## Before working on this project

Read `docs/architecture/overview.md` first, then the file for whichever block you're working on:

- `docs/architecture/web.md` — the design reference is in `design/`, kept outside git: wireframes, user flows, final screens, and the design system
- `docs/architecture/api.md`
- `docs/architecture/prices.md` — the internal price service
- `docs/architecture/database.md` — includes the shared `@fpr/db` package
- `docs/architecture/auth.md`
- `docs/architecture/deployment.md`

These files are the source of truth for the architecture: what each block is and how it works. Product behaviour and every flow case are in `docs/product/user-stories.md`.

## Progress tracking

Progress, tickets, and planning live on the repository owner's GitHub Project number 5, not in these docs.

Fields: **Status** (Todo/In Progress/Done), **Area** (Web, API, Database, Auth, Prices, Deployment, Overall, Doc), **Priority** (P0-P3). Milestones serve as sprints.

How to create and fully wire up a ticket: `.claude/github-project-workflow.md`.

## Standing rules

- No `Co-Authored-By: Claude` trailer on any commit.
- Scaffold with generators (`pnpm init`, `pnpm create vite`, `tsc --init`, `pnpm add`), then edit the generated files. Never hand-write a `package.json`.
- Before a multi-file edit batch, state the plan back and check for edge cases (for example, tables with two writers).
- Challenge the docs and propose better user flows. Record every flow case in `docs/product/user-stories.md`.
- Tailwind: registered tokens only, arbitrary value otherwise (`pt-[2.5rem]`). Propose a new token instead of inventing one. Full conventions: the `fpr-ui` skill.
- Docs: affirmative, factual, and standalone. They state what the system is, not why or how it was decided. No decision records in the repository.
- Every ticket has a coverage checklist specific to its problem. It closes only when every item is checked.
- Load `supabase-postgres-best-practices` before any schema, migration, index, or query work.

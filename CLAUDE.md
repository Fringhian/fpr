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
- Docs: affirmative, factual, and standalone. They state what the system is, not why or how it was decided. No decision records in the repository. A doc says what a block is, how its parts fit, and the rules that span files; code-level detail (function names, per-field shapes, wiring) stays in the code and the contracts. Each topic lives in one doc, and the others link to it. A small change edits the sentence it affects rather than adding one.
- Every ticket has a coverage checklist specific to its problem. It closes only when every item is checked.
- Load `supabase-postgres-best-practices` before any schema, migration, index, or query work.
- `.claude/hooks/require-skills.sh` blocks an edit until the session has loaded the skills its file needs: `react-best-practices`, `fpr-ui` and `typescript-advanced-types` for `apps/web` code, `fpr-ui` for its CSS, `typescript-advanced-types` for any other TypeScript, and `supabase-postgres-best-practices` for `packages/db`, SQL and migrations.
- Change source files with the Edit and Write tools, never through shell commands, so the skill hook sees every edit.
- Tests: essential ones only, high-value integration or E2E (API over HTTP, auth and access, database rules, contract-wide guards). No unit tests for trivial helpers, formatting, getters, or schema accept/refuse lists, and no test file per source file: add a case to an existing suite first. Components have no unit tests; their stories are their check. Tests live in the workspace's `test/` folder. Each API route is tested over HTTP in `test/routes/<route>.test.ts`, named after the route, with its essential cases only.
- Split a folder into subfolders before it grows flat and crowded. Each web component has its own folder, `src/components/<story group>/<component>/`, with its stories and any `-model.ts`; components shown in one story share a folder. Imports name the file, with no barrel files.

## Code style

- Comments: JSDoc on an exported function, constant, type or prop only when it adds something the name and type don't. Comments on tricky code and on core blocks (auth, access, anonymization, valuation, the price refresh). No comment that restates a name, sits on a file-local helper, or banners a section. A comment is impersonal and present tense: no "we", "you", "note that", no history.
- Types: a short, unshared parameter type is written inline. An exported component has one props type, in one declaration. A one-line alias used once is inlined. A type or list that exists once is imported, never redeclared: wire types come from `@fpr/contracts`.
- Reuse before building: search `src/components` and `src/lib` (or the package) for a block that already does it. On the second copy of markup, a class map, a helper or a type, extract a shared one.
- Size: a function or component reads on one screen, about 50 lines; a longer one is split into named steps or parts. A file that holds more than one job, or runs past about 200 lines, becomes a folder of files split by responsibility. These are signals, not quotas: a split exists when each piece reads on its own, never to land under a number.
- Files: split by responsibility. A helper used by one file sits next to it; `lib/` holds what two or more places use.
- Errors: one error class per failure family a caller handles differently.
- A complex molecule or organism exposes its parts, imported as a namespace (`<HoldingCard.Root>`, `<HoldingCard.Value>`), and `Basic`, the ready-made composition driven by props. A special case composes the parts instead of adding a prop. Atoms and simple molecules keep plain props.

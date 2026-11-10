---
name: fpr-ui
description: FPR web app UI conventions — Tailwind v4 registered tokens, size scale, breakpoints, Base UI component structure, design workflow. Load before writing or reviewing any apps/web component or screen, or any Tailwind class in this repo.
---

# FPR UI conventions

These conventions win over any other skill's advice on styling or components — `tailwind-design-system`, `impeccable`, `web-design-guidelines`, `react-best-practices` included.

## Stack

- `apps/web` — React, Vite, TanStack Router (file-based routes), TanStack Query, Tailwind v4.
- Components live in `apps/web/src/components/ui/`. They move to a package only if a second consumer appears.

## Design workflow

The design reference lives in `design/`, outside git like a design tool's files:

| File | What it fixes |
| --- | --- |
| `design/wireframes.html` | Every screen's layout, content, and states, at phone, tablet, and desktop widths |
| `design/user-flows.html` | Every path through the app, drawn from `docs/product/user-flows.md` |
| `design/screens.html` | Every screen in its final look |
| `design/design-system.html` | Every reusable part, from tokens to organisms, with its variants and states |

impeccable's `PRODUCT.md`, `DESIGN.md` (the tokens and rules of the look), and `.impeccable/` stay outside git too. The repository's `.gitignore` lists them all.

1. The tokens in `DESIGN.md` and the design system move into `apps/web/src/theme.css`. From then on `theme.css` holds every design value.
2. Each component is built in `apps/web/src/components/ui/` from the design system, with its Storybook story showing every variant and state the design system lists. Once a component has its story, the story is its reference.
3. Each screen is built from its wireframe, its final look in `design/screens.html`, and the components. Once a screen is built, its code is the reference and the design files are not updated for it.

## Storybook

- Storybook runs in `apps/web` with the Vite builder and loads the real `theme.css` and fonts.
- Every component in `src/components/ui/` has a story file beside it. Stories are grouped Foundations, Atoms, Molecules, Organisms, Templates, like the design system.
- A story shows every variant and state of its component, and the widths where it changes.
- The accessibility addon runs on every story. A story with violations doesn't merge.

impeccable serves this workflow:

- `PRODUCT.md` points to `docs/product/user-stories.md`, `docs/architecture/overview.md`, and `docs/architecture/web.md` instead of restating them.
- Everything impeccable proposes is expressed in these conventions — semantic color tokens, the `xs`–`xl` scales, `tablet:` / `desktop:`, light theme only.
- The impeccable design-detector hook stays off until the user turns it on.

## Interface rules

impeccable's craft floor and the Web Interface Guidelines (the `web-design-guidelines` skill) apply. On top of them, and over them where they differ:

- Sentence case for headings, buttons, and labels, in both languages. Never Title Case.
- Copy: second person, active voice. A button names its action ("Save change", "Review change"), never a bare "Continue". In a step flow the main button (full width at the bottom on phone, fitted to its label bottom right on tablet and desktop) names what comes next ("Choose the date", "Meet everyone"); an arrow at its right end means another step follows, and the last button of a flow ("Save change", "Go to Home") has none. Errors say what went wrong and what to do next. English uses curly quotes and `…`; French uses « » with narrow no-break spaces.
- No data tables. Lists are cards, lanes, strips, and timelines.
- Icons: Phosphor (`@phosphor-icons/react`), regular weight, fill weight for the current navigation item. No character or emoji stands in for an icon.
- One overlay at a time: a dialog never opens another dialog.
- Charts: identity never rests on colour alone. The race draws only the viewer and the focused member in colour, the others in grey, each line named by its owner's picture. A categorical palette passes the `dataviz` skill's validator before it ships.
- Text sizes form a role scale: each size has one job (caption, label, body, title, headline, display), and adjacent sizes differ enough to read as different roles. No one-off sizes.

## Tokens

- Tokens live in `apps/web/src/theme.css`, the Tailwind v4 `@theme` block — the only place a design value is defined.
- Tailwind's default scales are reset (`--color-*: initial;`, `--spacing-*: initial;`, `--breakpoint-*: initial;`, and so on), so only registered tokens generate classes.
- Colors are semantic: `text-primary`, `bg-surface`, never `text-red-500`.
- Every size scale uses the same names — `xs`, `s`, `m`, `l`, `xl` — with its own values per namespace: spacing (`p-m`, `gap-s`, `w-l`), text (`text-s`), radius (`rounded-m`), container (`max-w-l`). Text adds one more step, `display`, for the page sentence on tablet and desktop.
- Breakpoints are mobile-first: phone is the unprefixed base, then `tablet:` from 40rem (640 px) and `desktop:` from 70rem (1120 px).
- Light theme only in v1. Components never use `dark:`; a later dark theme is a second set of token values.

### Unregistered values

When a value has no registered token, write the arbitrary value — `pt-[2.5rem]` — never an unregistered token name like `pt-xxl`, which generates nothing. When the same arbitrary value recurs, propose a new token to the user; don't add one unilaterally.

## Readable classes

- State styles use named custom variants defined once in `theme.css` (`@custom-variant open (&[data-open]);` → `open:bg-surface-raised`), not raw `data-[…]:` selectors.
- A pattern repeated across components becomes a named `@utility` (e.g. `focus-ring`), not a copied class chain.

## Components

- shadcn's philosophy, not its code: every component's source lives in this repository, built on Base UI primitives.
- Compound and destructurable: a component is a set of parts (`Card.Root`, `Card.Header`, `Card.Body`), each a thin styled wrapper that passes props through, so a screen composes only the parts it needs.
- Variants are few and named (`intent`, `size`, using the scale names above). The variant helper is not yet chosen.

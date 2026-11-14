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

### Split classes with `cn`, one argument per breakpoint

Every `className` with a breakpoint or state class is written with `cn`, its classes split into groups, in this order:

```tsx
cn(
  "classes common to every breakpoint",
  "phone classes (unprefixed)",
  "tablet: classes",
  "desktop: classes",
)
```

- A property that changes at any breakpoint is declared at every breakpoint, in each group, even where its value repeats. The common group never holds it.

  ```tsx
  // No padding on phone, padding from tablet up
  cn("bg-primary", "p-0", "tablet:p-xs", "desktop:p-xs")
  ```

  Never `cn("bg-primary tablet:p-xs")`: the phone value is implicit and the desktop value is inherited, so no group reads on its own.
- States (`hover:`, `focus-visible:`, `open:`, `disabled:`…) follow the same principle: each state gets its own argument after the breakpoint groups, and every property a state changes has its resting value written out above it, never left implicit.

  ```tsx
  cn(
    "rounded-full bg-surface text-s font-semibold",
    "px-m",
    "tablet:px-l",
    "desktop:px-l",
    "hover:bg-highlight",
    "focus-visible:bg-highlight",
  )
  ```
- The groups are positional: an empty group is an empty string, so the phone group is always the second argument.

  ```tsx
  cn("", "hidden", "tablet:inline", "desktop:hidden")
  ```
- `cn` also joins a class chosen at runtime, as its own argument: `cn("h-s rounded-full", line)`. Never a template literal.
- A class list with no breakpoint or state class and nothing chosen at runtime stays a plain string.
- `cn` lives in `src/lib/cn.ts`: `clsx`, then `tailwind-merge` taught the scales of `theme.css`. A new scale or token name in `theme.css` is added to its config too, with a test in `cn.test.ts`.

### Variants and utilities

- State styles use the named variants defined once at the end of `theme.css`, never raw `data-[…]:` or `aria-[…]:` selectors. Each matches Base UI's data attribute and, where they exist, the native state and its ARIA attribute, so one class styles a native element and a Base UI part alike:

  | Variant | Matches | Parts |
  | --- | --- | --- |
  | `open:` | `[open]`, `:popover-open`, `:open`, `[data-open]` | Dialog, sheet, popover, menu, disclosure |
  | `popup-open:` | `[data-popup-open]` | The trigger of an open popup |
  | `starting-style:` | `[data-starting-style]` | A popup's first frame, before it transitions in |
  | `ending-style:` | `[data-ending-style]` | A popup's last frame, as it transitions out |
  | `disabled:` | `:disabled`, `[data-disabled]`, `[aria-disabled="true"]` | Any control |
  | `checked:` | `:checked`, `[data-checked]`, `[aria-checked="true"]` | Checkbox, radio, switch, swatch |
  | `pressed:` | `[data-pressed]`, `[aria-pressed="true"]` | Toggle, segment |
  | `selected:` | `[data-selected]`, `[aria-selected="true"]` | Option of a select or combobox |
  | `highlighted:` | `[data-highlighted]` | Option or menu item under the pointer or the arrow keys |
  | `current:` | `[data-active]`, `[aria-current]` other than `false` | Current navigation link, active tab |
  | `invalid:` | `[data-invalid]`, `[aria-invalid="true"]` | Field, input |

  `open:`, `disabled:` and `checked:` extend Tailwind's built-in variants of the same name. `invalid:` replaces Tailwind's: native `:invalid` matches an empty required field before anyone types, and `user-invalid:` covers a native field after input. They combine like any variant: `group-open:`, `peer-disabled:`, `not-disabled:`, `tablet:disabled:`. A state no variant names gets a new `@custom-variant` beside the others.
- A pattern repeated across components becomes a named `@utility` in that same block of `theme.css`, not a copied class chain.
- `focus-ring` is the keyboard focus ring: a 2 px charcoal outline, 2 px off the edge, which reads on the page, on surfaces and under the sky. Every focusable control applies it in its `focus-visible:` group; with no outline at rest, it has no resting value to write.

  ```tsx
  cn("rounded-full bg-primary text-on-primary", "", "", "", "focus-visible:focus-ring")
  ```

  A control whose focus lands on an inner element uses `has-focus-visible:focus-ring`. A text input marks its focus with its inset outline instead.

## Components

- shadcn's philosophy, not its code: every component's source lives in this repository, built on Base UI primitives.
- Compound and destructurable: a component is a set of parts (`Card.Root`, `Card.Header`, `Card.Body`), each a thin styled wrapper that passes props through, so a screen composes only the parts it needs.
- Variants are few and named (`intent`, `size`, using the scale names above).
- The variant helper is `cva`, from `class-variance-authority`. It only joins classes: `cn` wraps its result, so the theme's merge config resolves every conflict, including a `className` passed in. Its base and each variant value are arrays laid out like `cn`'s groups: common, phone, `tablet:`, `desktop:`, then states.

  ```tsx
  import { cva, type VariantProps } from "class-variance-authority";
  import { cn } from "../../lib/cn";

  const button = cva(
    ["rounded-full font-semibold", "", "", "", "focus-visible:focus-ring", "disabled:opacity-[0.45]"],
    {
      variants: {
        intent: {
          primary: ["bg-primary text-on-primary", "", "", "", "hover:bg-secondary"],
          secondary: ["bg-surface text-primary shadow-outline", "", "", "", "hover:bg-highlight"],
        },
        size: {
          s: ["text-s", "px-s", "tablet:px-s", "desktop:px-s"],
          m: ["text-m", "px-m", "tablet:px-l", "desktop:px-l"],
        },
      },
      defaultVariants: { intent: "primary", size: "m" },
    },
  );

  type ButtonProps = ComponentProps<"button"> & VariantProps<typeof button>;

  function Button({ intent, size, className, ...props }: ButtonProps) {
    return <button className={cn(button({ intent, size }), className)} {...props} />;
  }
  ```

  A compound component gives each part its own `cva`, or a plain `cn` call when the part has no variant.

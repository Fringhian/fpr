---
name: fpr-ui
description: FPR web app UI conventions — Tailwind v4 registered tokens, size scale, breakpoints, Base UI component structure, design workflow. Load before writing or reviewing any apps/web component or screen, or any Tailwind class in this repo.
---

# FPR UI conventions

These conventions win over any other skill's advice on styling or components — `tailwind-design-system`, `impeccable`, `web-design-guidelines`, `react-best-practices` included.

## Stack

- `apps/web` — React, Vite, TanStack Router (file-based routes), TanStack Query, Tailwind v4.
- Components live in `apps/web/src/components/`, split into `foundations/`, `atoms/`, `molecules/` and `organisms/`, one folder per component (`atoms/button/button.tsx`, `atoms/button/button.stories.tsx`). They move to a package only if a second consumer appears.
- A helper used by one component sits beside it, as `<component>-model.ts` or a named sibling (`allocation-bar/allocation-bar-model.ts`). `src/lib/` holds what two or more places use.
- The web app imports contracts' value lists (periods, units, languages, boards…) from `@fpr/contracts/values`, and everything else from `@fpr/contracts` as `import type`, so Zod and oRPC stay out of the bundle. A type or list that exists there is never redeclared.

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
2. Each component is built in its own folder in `apps/web/src/components/<group>/` from the design system, with its Storybook story showing every variant and state the design system lists. Once a component has its story, the story is its reference.
3. Each screen is built from its wireframe, its final look in `design/screens.html`, and the components. Once a screen is built, its code is the reference and the design files are not updated for it.

## Storybook

- Storybook runs in `apps/web` with the Vite builder and loads the real `theme.css` and fonts.
- Every component in `src/components/` has a story file beside it. Stories are grouped Foundations, Atoms, Molecules, Organisms, Templates, like the design system.
- A story shows every variant and state of its component, and the widths where it changes.
- A component's props are its stories' `args`, with `argTypes` giving each one its control (`inline-radio` for a variant, `boolean`, `text`), so every variant can be changed live in the Controls panel. A prop that takes a component, such as an icon, is picked by name: a `select` of names, and the story's `render` turns the name into the component (a `mapping` can't show its starting value in the panel). A prop that only makes sense with another one uses `if: { arg: … }`.
- The controls test the component itself and nothing else: its real props, and for a compound component, a `boolean` per optional part that renders it or not (named after the part, `name: "Sky.Band"`). The demo content the story puts inside it (a title, a sentence, a card) is fixed in the story, never a control: a control implies the component accepts that prop. A part being absent is a control, not a story of its own.
- A component's story file carries `tags: ["autodocs"]`: its Docs page lists every prop, with the controls, from the component's own types and doc comments.
- A catalogue with nothing to configure (a token page, a list of every icon) is a fixed `render`, with `parameters: { controls: { disable: true } }`.
- A story that only changes the viewport (Phone, Tablet) carries `tags: ["!autodocs"]`: the Docs page renders every story at the page's own width, so it would only repeat the desktop.
- The accessibility addon runs on every story. A story with violations doesn't merge.
- Every new or changed story is checked by eye before it merges: screenshots of each story at 375, 768 and 1280 px, and of its Docs page scrolled to the end. Passing tests don't show a stretched block, a repeated story, or a missing description.

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
- Each state role has a soft fill, its pale ground: `positive-soft`, `negative-soft`, `success-soft`, `warning-soft`. Text on a soft fill takes its role (`bg-positive-soft text-positive`), at 4.5:1 or more.
- Every size scale uses the same names — `xs`, `s`, `m`, `l`, `xl` — with its own values per namespace: spacing (`p-m`, `gap-s`, `w-l`), text (`text-s`), radius (`rounded-m`), container (`max-w-l`). Text adds one more step, `display`, for the page sentence on tablet and desktop. Spacing adds `0` (`p-0`, `inset-0`, `min-h-0`). Radius adds `card`, 18 px between `m` and `l`, for person rows, option cards and popovers (`rounded-card`).
- Two outlines: `shadow-outline` draws the divider line outside a card's edge; `inset-shadow-outline` draws it inside the edge, for inputs, options and flat cards, and `inset-shadow-<colour>` recolours it for a state (`focus-within:inset-shadow-primary`, `invalid:inset-shadow-error`). An inset ring and a drop shadow combine (`inset-shadow-outline shadow-float`).
- Motion: one easing, `ease-soft`, and three durations, `duration-s` (150 ms, a state change), `duration-m` (200 ms, a popup, a sheet, a panel or a segment's capsule gliding) and `duration-l` (300 ms, a bar or a lane moving, or a tab's page sliding in). A script reads the same tokens from the page (`--ease-soft`, `--transition-duration-l`) with `cssVariable` from `src/lib/css-variable.ts`. Anything that moves or resizes stills under `motion-reduce:`.
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
- `cn` lives in `src/lib/cn.ts`: `clsx`, then `tailwind-merge` taught the scales of `theme.css`. A new scale or token name in `theme.css` is added to its config too.

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
- `dimmed` is the look of a control that can't be used: the not-allowed cursor at 45 % opacity, applied with `disabled:dimmed`.
- `popup-motion` is a menu's or a popover's popup fading and scaling in from its trigger and out to it, still under reduced motion.
- `card-link` is a link that opens its whole card, such as a holding card's name or a member strip's: its hit area covers the `relative` card, and `focus-visible:after:focus-ring` draws its focus round it.
- `frosted` is a bar floating over the page, such as the tab bar or the compact page bar: 80% white over a blur, opaque where the browser can't blur.
- `scroller:` styles the page's scrolling element, `<html>`, while the element is on the page. A bar over the page sets the scroll padding that keeps a focused element clear of it with it, `scroller:scroll-pt-[…]`, never a global rule; a bar whose height follows its content measures itself instead, like `StepFlow.Actions`.
- `tab-sliding:` styles an element while a tab's page slides in on a phone. A transition's snapshot can't blur what is behind it, so a frosted bar turns opaque meanwhile: `tab-sliding:bg-surface`.

## Components

- shadcn's philosophy, not its code: every component's source lives in this repository, built on Base UI primitives.
- Reuse before building. Before writing a component or a helper, search `src/components` and `src/lib` for one that already draws or computes it, and render or call it. The second copy of any markup, class map, helper or type becomes one shared block, used by both, instead of a copy.
- A component reads on one screen, about 50 lines. A longer one is split into named sub-components, in the same file or a sibling file.
- Atoms and simple molecules take plain props. A complex molecule or organism (eight or so props, or several optional regions) exposes its parts, each a thin styled wrapper taking `className`, `children` and the HTML props of its element, imported as a namespace: `import * as HoldingCard from "…/holding-card"`, then `<HoldingCard.Root>`, `<HoldingCard.Value>`. It also exports `Basic`, the ready-made composition driven by props, for the common case. A screen with a special need composes the parts with its own child instead of adding a prop. Its stories show `Basic`, plus one story composing the parts.
- A component that enforces a display rule from data, such as hiding names from an anonymous viewer or folding small holdings into “Other”, keeps the rule inside it, whether in `Basic` or in a part.
- An exported component has one props type, written as one declaration: its own props plus every prop of what it renders, `type ChipProps = { … } & Omit<ComponentProps<"span">, "gain" | "children">`, or `ComponentProps<typeof BaseButton>` for a Base UI part. A prop's JSDoc shows in the Docs table: it is written only when it adds something the name and type don't (a unit, a size in px, what `null` means, a rule). `className` keeps the type of what it renders and is never narrowed: on a Base UI part it is a string or a function of the part's state, resolved after the part's own classes by `stateClassName` from `src/lib/cn.ts`:

  ```tsx
  className={stateClassName(classes, className)}
  ```
- A place for an icon is a prop that takes any Phosphor icon (`icon`, or named for its place: `nextIcon`), with a default when the design fixes one, never an icon written into the component. An optional icon prop also accepts `undefined`, so a caller can pass one conditionally.
- Inside a component, three groups, each separated by a blank line: the hook calls (`useTranslation()`, `useState()`…), then the values derived from props and hooks, then the `return`.

  ```tsx
  const { t } = useTranslation();

  const busy = loading === true;
  const arrow = size === "step" && next;

  return (…);
  ```
- Variants are few and named (`intent`, `size`, using the scale names above).
- The variant helper is `cva`, from `class-variance-authority`. It only joins classes: `cn` wraps its result, so the theme's merge config resolves every conflict, including a `className` passed in. Its base and each variant value are arrays laid out like `cn`'s groups: common, phone, `tablet:`, `desktop:`, then states.

  ```tsx
  import { cva, type VariantProps } from "class-variance-authority";
  import { cn } from "../../../lib/cn";

  const button = cva(
    ["rounded-full font-semibold", "", "", "", "focus-visible:focus-ring", "disabled:dimmed"],
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

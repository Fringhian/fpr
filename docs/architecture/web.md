# Web

`apps/web`, a React app built with Vite and served as static files. It talks only to the API, under `/api` on the same origin.

The UI conventions (tokens and their names, how classes are written, component structure, story rules, interface and copy rules) are in the `fpr-ui` skill, `.claude/skills/fpr-ui/SKILL.md`. This doc covers how the app is put together.

## Stack

| Concern | Choice |
| --- | --- |
| Framework | React, built with Vite |
| Routing | TanStack Router, file-based routes in `src/routes/` |
| Server state | TanStack Query |
| Request and response types | `@fpr/contracts` |
| Styling | Tailwind v4, registered tokens only, defined in `src/theme.css` |
| Components | Base UI, wrapped as the app's own components in `src/components/` |
| Component workshop | Storybook |
| Charts | TradingView Lightweight Charts |
| Icons | Phosphor, `@phosphor-icons/react` |
| Languages | English and French, with `react-i18next` |
| Install | Progressive Web App, with `vite-plugin-pwa` |

TanStack Router's Vite plugin generates `src/routeTree.gen.ts` from `src/routes/` and splits each route into its own chunk. The generated file is committed and left out of Biome.

## Tokens

`src/theme.css` is the only place a design value is defined. It has three parts, in order:

- The palette: every hue, named by what it is (`--palette-charcoal`, `--palette-peach`, …), and the ridge's two shapes, as plain CSS variables that generate no classes.
- The `@theme` block: colour roles that point at the palette, their soft fills, the member colours, and the text, spacing, radius, shadow, inset shadow and breakpoint scales. Tailwind's default scales are reset, so only these tokens generate classes.
- The shared utilities, such as `focus-ring`, and one variant per component state.

The ten member colours, each with its `-pastel`, are in the order a new person is given them: `vermilion`, `cobalt`, `green`, `violet`, `amber`, `pink`, `cyan`, `lime`, `sienna`, `periwinkle`.

The Foundations stories, in `src/foundations/`, show every token with its value in the page.

## Type and icons

- Figtree is the interface's typeface, shipped with the build from `@fontsource-variable/figtree` (imported in `src/index.css`), on a variable weight axis. Rubik, in its 900 weight from `@fontsource/rubik`, draws the FPR wordmark only.
- Three weights: `font-normal` (400) to read, `font-medium` (500) for labels, `font-semibold` (600) to name or rank.
- Figures that line up, such as amounts, percentages, ranks and times, use `tabular-nums`.
- Icons are Phosphor, drawn through `Icon` in `src/components/foundations/icon/icon.tsx`, in three sizes: `s` (16 px) in text, `m` (20 px) in navigation, `l` (24 px) for page actions and state icons. An icon takes the current text colour, and is hidden from screen readers unless it has a label.
- Each icon is imported from its own module (`@phosphor-icons/react/House`), never from the package root, so the bundle holds only the icons in use.

## Storybook

Storybook runs in `apps/web` with the Vite builder, on the app's own `vite.config.ts`, and its preview loads `src/index.css`. Stories sit beside what they show, grouped Foundations, Atoms, Molecules, Organisms, Templates; the folder layout and story rules are in `fpr-ui`.

- The viewport menu has the phone (375 px), the tablet (768 px) and the desktop (1280 px). The language menu shows every story in English or French.
- The canvas is the page ground, so a story ends on snow.
- The accessibility addon checks every story, and a violation fails it.

| Command | What it does |
| --- | --- |
| `pnpm storybook` | Serves Storybook on port 6006 |
| `build-storybook` | Builds it to `apps/web/storybook-static/` |
| `test-storybook` | Runs every story in headless Chromium through Vitest, with `vitest.storybook.config.ts`, apart from `pnpm test` |

CI builds Storybook and runs its tests. The test run bundles every dependency before the first story: a library the components build on is listed in `optimizeDeps.include` of `vitest.storybook.config.ts`, so the browser never reloads mid-run.

## Design

The design reference lives in `design/`, outside git: the wireframes draw every screen's layout and states at phone, tablet and desktop widths, the screens show their final look, and the design system names every reusable part. Once a component or screen is built, its code and story are the reference.

- The everyday screens (Home, Members, Portfolio, Shares) are designed for the phone first. The desktop is complete and polished on every screen.
- Tablet: a navigation rail, cards two per row, and the focused pages (sign-in, onboarding, record a change) in one centred column. Nothing depends on hover.
- A screen with no phone use, such as the admin area, works on tablet and desktop. On a phone it shows a short message to open it on a larger screen.
- Light theme only.

### Sky and ridge

The page background is `Sky`, in `src/components/foundations/sky/sky.tsx`: a snow ground and, behind the top of the page, a peach sky closed by a two-layer ridge. A page with a header sentence (Home, Portfolio, a member, a share) has the sky, with the sentence above the ridge; a page without one starts on snow. The header has a fixed height below the top safe area, so a sentence that doesn't fit means the page has no sky. Its story, Foundations › Sky and ridge, shows the geometry at each width.

## Screens

| Route | Screen | Stories |
| --- | --- | --- |
| `/setup` | First-admin setup | Admin, first-admin case |
| `/sign-in` | Sign in | ACC-2 |
| `/access/$key` | Access link, shown at `/access` once its key leaves the address: set a password, or sign in as an anonymous viewer | ACC-1, ANO-1 |
| `/reset-password` | Email and reset key, then the new password | ACC-3 |
| `/onboarding` | Name, colour and optional photo, the prepared portfolio, then a welcome | ONB-1 to ONB-4 |
| `/` | Home: the race, the focused member's panel, the standings | LDB-1 to LDB-3, LDB-7, CMP-1 to CMP-3 |
| `/members` | Every member | CMP-4 |
| `/members/$userId` | A member's page, read-only, or editable by the admin with `?edit=true` | CMP-5, ADM-7 |
| `/portfolio` | My portfolio, its chart, and the latest changes | POR-1, POR-6 |
| `/portfolio/record` | Record a change: bought, sold, or cash | POR-2 to POR-4, POR-7 |
| `/members/$userId/record` | The admin records a change for a member, with the same flow | ADM-7 |
| `/members/$userId/history` | Every change of a member's portfolio, for the admin in edit mode | ADM-7 |
| `/portfolio/history` | Every share change and cash balance | POR-5 |
| `/shares` | Every share, and the search | SHR-1, SHR-5, SHR-7 |
| `/shares/$shareId` | A share's page | SHR-2 to SHR-6 |
| `/help` | How FPR works | HLP-1 |
| `/admin/people` | People and access | ADM-1 to ADM-8 |
| `/admin/shares` | Tracked shares | ADM-9 to ADM-12 |

Settings (ACC-4 to ACC-7) is a dialog on tablet and desktop and a sheet on phone, opened from the account menu. Share search lives on `/shares`, and the record flow reuses it.

## Navigation

- Desktop: a sidebar with Home, Members, Portfolio and Shares, then an Admin group with People and Tracked shares for admins. The account menu at its bottom opens Settings, How FPR works, and Sign out.
- Tablet: a navigation rail with the same items and the account menu.
- Phone: the account menu at the end of the page bar, and a floating tab bar with the four items, which the content scrolls under. Nothing floats beside it.
- Guests and anonymous viewers have no Portfolio item.
- Every page starts with a page bar: the title or back link, then the period and unit. Once it scrolls past the top, a compact bar with the title, period and unit takes its place there, pinned on tablet and desktop, and on a phone hidden on scroll down and back on the first scroll up. On a phone, the period and unit are one button in the page bar that opens a sheet.
- The period and unit are one setting shared by every page, kept in `localStorage` and written in the URL. An address without them opens on the kept setting, else this month in percent.
- Every view's state is in the URL, so a shared link opens on the same view: `period` and `unit` everywhere, `focus` (the kept member) and `standings` (`gain` or `balance`) on Home, `q` on Shares.

## Interface

- A "Skip to content" link comes first. Every control shows a visible focus ring, and every icon-only button has an accessible label.
- The tab's title names the page or step. A new page or step is announced by its heading, which takes focus when the focused control left with the last one.
- Every chart is `Chart`, in `src/components/molecules/chart/chart.tsx`, on Lightweight Charts, with its colours read from `theme.css` at runtime. Charts follow the hover with a crosshair and give the same values on keyboard focus.
- The charts carry no TradingView logo. How FPR works credits TradingView Lightweight Charts with a link to tradingview.com, as the library's licence asks.
- Leaving a form with unsaved input asks first, and so does the browser before the tab closes. Deleting asks to confirm, or offers Undo in a toast, which shows in one polite live region per layout.
- Motion respects `prefers-reduced-motion`.

## Languages

- Every interface text lives in `src/locales/en.json` and `src/locales/fr.json`, never in a component. Translation keys are typed from `en.json`, so an unknown key fails the type check.
- The page's `lang` attribute follows its language.
- FPR is in French until a person picks a language, on a step of a focused page or in Settings, whatever the browser's language. The device keeps the pick, before sign-in included; a signed-in person's pick is also kept on their account, and wins on every device.
- The API sends codes and data, never sentences. The web app writes the words.
- `test/locales.test.ts`, part of `pnpm test`, fails when a key exists in one file and not the other (plural forms count as their base key), and when a text breaks the typography rules below.

### Formatting

Numbers, amounts and dates are formatted with `Intl` by the functions of `src/lib/format/` (`number.ts`, `money.ts`, `date.ts`, `text.ts`), each given the value and the language. English formats as `en-GB` and French as `fr-FR`: the day before the month, and the 24-hour clock.

| Value | English | French |
| --- | --- | --- |
| Money, in cents or whole euros | `€1,234.56`, `€12,374` | `1 234,56 €`, `12 374 €` |
| Signed money | `+€512.00`, `−€18.30` | `+512,00 €`, `−18,30 €` |
| Percentage, one decimal | `16.2%`, `+4.2%` | `16,2 %`, `+4,2 %` |
| Gain | `+€512 (+4.2%)` | `+512 € (+4,2 %)` |
| Quantity | `74.328`, `10`, `1.50` | `74,328`, `10`, `1,50` |
| Date | `5 Mar`, `5 March 2026`, `Thu 5 Mar` | `5 mars`, `5 mars 2026`, `jeu. 5 mars` |
| Time | `14:30` | `14:30` |

- Every amount, quantity and percentage arrives as the decimal string the API sends, and is formatted exactly, with no floating-point rounding. A quantity keeps the fractional digits it was entered with.
- A signed value has a sign unless it rounds to zero. An unsigned one has a minus only when negative, and never shows a negative zero. Every minus is `−` (U+2212).
- A day is read in UTC, so it never moves to the day before or after. A timestamp is read in the browser's time zone, except on a chart, which puts each point on its day in the race's time zone, where the API dates its closes: `/me`'s `raceTimeZone`, and `Europe/Paris`, the default `RACE_TIMEZONE`, before sign-in.

### Typography

- English uses curly quotes and apostrophes (“ ” ’) and the ellipsis `…`.
- French uses « » and the narrow no-break space U+202F: after «, before ; : ! ? and », and between a number's digit groups, its sign and its unit, whatever the browser's `Intl` data writes.

## Data

- Every API call goes through one client typed by `@fpr/contracts`, and every read through TanStack Query. The client finds each route's method and path in `src/lib/api/contract.gen.json`, generated from the contracts without their schemas: a web test fails when it is out of date, and `pnpm test --project @fpr/web -u` rewrites it.
- The mock API in `src/mocks/` answers every route of the contracts through MSW, from an in-memory store seeded with invented fixtures, validated against the contracts and anonymized for an anonymous viewer as the API does. `pnpm dev:mock` runs the app on it, with a role switch in that mode only, and a story runs on it with `parameters: { msw: mockApi({ session }) }`. Production builds hold none of it.
- A write invalidates the queries it affects, from one table that names every write route, and so does a write refused with `value_changed`. A portfolio write invalidates the portfolio, the log, the leaderboards, the members list and the race chart.
- Screens showing prices refetch every 5 minutes while visible, and when the window regains focus. Each refetch reads Postgres only.
- Every price shows its time: "as of 14:30", or "close of 5 March".
- The race chart draws the points after the last close dashed, labelled "today, not final".
- An "access ended" answer to any call signs the person out and shows "Your access has ended". An "unauthenticated" answer mid-visit, once the session has expired, leads to sign-in, then back to the page.

## Installable app

FPR is a Progressive Web App: it installs to a phone's home screen or a computer's dock and opens full screen.

- `vite-plugin-pwa` generates the manifest and the service worker at build time. The manifest opens on `/` in standalone mode, with the design system's colours and the app's icons (192 and 512 px, a maskable 512 px, and a 180 px Apple touch icon).
- The icons, in `public/icons/`, are the wordmark's F, P and R in cobalt, vermilion and green on cream, with the F alone at favicon sizes, drawn from `theme.css` by `pnpm --filter @fpr/web icons`.
- The service worker precaches the app shell (HTML, scripts, styles, fonts, icons) and never caches `/api/*`. Data always comes from the API.
- Offline, the app still opens, each screen shows "You're offline" with Retry and loads again once the network is back, and a change fails at once with "You're offline", never queued.
- A new version installs in the background, then the app offers Reload. It never reloads by itself.
- Installed, the top and bottom bars pad for the device's safe areas, and the `theme-color` meta tag matches the top bar where the platform uses it: the sky on a page with one, snow otherwise. iOS shows its default status bar.
- An app installed on iOS keeps its own cookies, apart from Safari's, so its first launch shows sign-in. The sign-in page accepts a pasted access link, which signs an anonymous viewer in or opens the first-use steps of a waiting link.

## Roles

Roles and what each may do are in `auth.md`. In the web app:

- The role comes from `GET /me`, and every control the role can't use is hidden. The API refuses those actions anyway.
- Anonymous viewers receive no euro amounts and no quantities (`api.md` › Anonymization), so every place that shows an amount can also show a percentage or a weight.
- Guests and anonymous viewers have no `/portfolio`. Anonymous viewers see `/admin/*` read-only.
- A person whose onboarding isn't finished is sent to `/onboarding` from every other screen.

## Serving

The web image builds the app and serves it with nginx, which forwards `/api/*` to the API. The browser sees one origin, so session cookies need no cross-site settings.

- Every route path serves `index.html`, so routes load directly. A missing hashed asset answers 404.
- `index.html`, the service worker and the manifest are served with `Cache-Control: no-cache`; the hashed build assets with a one-year `immutable` cache.
- Requests to `/access/*` carry an access key in their path and stay out of the access log.
- nginx takes the client's address from the header named by `CLIENT_IP_HEADER`, which the host's reverse proxy sets, and forwards it to the API as the only value of `X-Forwarded-For` (`auth.md` › Client address).
- Request bodies are capped at 1 MB, and at 2 MB on `PUT /api/me/avatar`, the API's picture limit. nginx answers a larger picture with `413 avatar_too_large` in the API's error format.

Every response, `/api/*` and errors included, carries these security headers once each; nginx drops the API's own values for them.

| Header | Value |
| --- | --- |
| `Content-Security-Policy` | `default-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'` |
| `X-Frame-Options` | `DENY` |
| `X-Content-Type-Options` | `nosniff` |
| `Referrer-Policy` | `no-referrer` |
| `Permissions-Policy` | `camera=(), microphone=(), geolocation=(), payment=(), usb=()` |
| `Cross-Origin-Opener-Policy` | `same-origin` |

Under this policy every script, font, request and worker comes from the app's own origin, and no script is inline. Inline styles and `data:` and `blob:` images, such as a photo's preview before upload, are allowed.

In development, Vite's dev server forwards `/api` to the local API on `http://localhost:3000` the same way, keeping the prefix and sending the client's address in `X-Forwarded-For`.

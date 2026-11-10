# Web

`apps/web`, a React app built with Vite and served as static files. It talks only to the API, under `/api` on the same origin.

## Stack

| Concern | Choice |
| --- | --- |
| Framework | React, built with Vite |
| Routing | TanStack Router, file-based routes in `src/routes/` |
| Server state | TanStack Query |
| Request and response types | `@fpr/contracts` |
| Styling | Tailwind v4, registered tokens only, defined in `src/theme.css` |
| Components | Base UI, wrapped as the app's own components in `src/components/ui/` |
| Component workshop | Storybook, one story per component |
| Charts | TradingView Lightweight Charts |
| Icons | Phosphor, `@phosphor-icons/react` |
| Breakpoints | phone (default), `tablet:` from 640 px, `desktop:` from 1120 px |
| Targets | Phone first for everyday screens; desktop complete and polished |
| Theme | Light only |
| Languages | English and French, with `react-i18next` |
| Install | Progressive Web App, with `vite-plugin-pwa` |

The full UI conventions are in the `fpr-ui` skill. The design reference lives in `design/`, kept outside git: the wireframes, the user flows, the final screens, and the design system.

## Design

- Every screen is drawn in the wireframes (`design/wireframes.html`): its layout on phone, tablet, and desktop, its content, and its states. `design/screens.html` shows each in its final look, and `design/design-system.html` names every reusable part.
- The everyday screens (Home, Members, Portfolio, Shares) are designed for the phone first, then laid out for the tablet and the desktop.
- The desktop is complete and polished on every screen. It is the full experience.
- Tablet: a navigation rail, cards two per row, and the focused pages (sign-in, onboarding, record a change) in one centred column. Nothing depends on hover.
- A screen may be limited to tablet and desktop when it has no phone use, such as the admin area. On a phone, it shows a short message to open it on a larger screen.
- Light theme only.

The design files fix each screen and component until it is built in `apps/web`. From then on, the code and its Storybook story are the reference.

## Screens

| Route | Screen | Stories |
| --- | --- | --- |
| `/setup` | First-admin setup | Admin, first-admin case |
| `/sign-in` | Sign in | ACC-2 |
| `/access/$key` | Access link: set a password, or sign in as an anonymous viewer | ACC-1, ANO-1 |
| `/reset-password` | Email and reset key, then the new password | ACC-3 |
| `/onboarding` | Name, colour and optional photo, the prepared portfolio, then a welcome | ONB-1 to ONB-4 |
| `/` | Home: the race, the focused member's panel, the standings | LDB-1 to LDB-3, LDB-7, CMP-1 to CMP-3 |
| `/members` | Every member | CMP-4 |
| `/members/$userId` | A member's page, read-only, or editable by the admin | CMP-5, ADM-7 |
| `/portfolio` | My portfolio, its chart, and the latest changes | POR-1, POR-6 |
| `/portfolio/record` | Record a change: bought, sold, or cash | POR-2 to POR-4, POR-7 |
| `/members/$userId/record` | The admin records a change for a member, with the same flow | ADM-7 |
| `/portfolio/history` | Every share change and cash balance | POR-5 |
| `/shares` | Every share, and the search | SHR-1, SHR-5, SHR-7 |
| `/shares/$shareId` | A share's page | SHR-2 to SHR-6 |
| `/help` | How FPR works | HLP-1 |
| `/admin/people` | People and access | ADM-1 to ADM-8 |
| `/admin/shares` | Tracked shares | ADM-9 to ADM-12 |

Settings (ACC-4 to ACC-7) is a dialog on tablet and desktop and a sheet on phone, opened from the account menu. Each setting is saved as soon as it changes.

## Navigation

- Desktop: a sidebar with Home, Members, Portfolio, and Shares, then an Admin group with People and Tracked shares for admins. The account menu at its bottom opens Settings, How FPR works, and Sign out.
- Tablet: a navigation rail with the same items, each icon above its name, and the account menu at its bottom.
- Phone: a top bar with the page title or a back link and the account menu, and a floating tab bar with the same four items: a pill above the content, which scrolls under it behind a light blur (`backdrop-filter`, with an opaque fallback). Nothing floats beside it: on Portfolio, Record a change is a full-width button under the chart. The admin area works on tablet and desktop.
- Guests and anonymous viewers have no Portfolio item.
- Every page starts with a page bar: the title or back link on the left, the period and unit on the right, and nothing else.
- The period and unit are one setting shared by every page, kept in `localStorage` and written in the URL. Tablet and desktop show them as the full bar in the page bar; the phone shows one button in the top bar, which opens a sheet with both.
- Every view's state is in the URL, so a shared link opens on the same view: `period` and `unit` everywhere, `focus` (the kept member) and `standings` (`gain` or `balance`) on Home, `q` on Shares.

## Interface

- Icons are Phosphor, regular weight; the current navigation item uses the fill weight. No character or emoji stands in for an icon.
- A "Skip to content" link comes first. Every control shows a visible focus ring, and every icon-only button has an accessible label.
- Charts follow the hover with a crosshair and the same values on keyboard focus. The race draws only the person and the focused member in colour; the others are grey, named by the picture at the end of their line.
- Leaving a form with unsaved input asks first, through the router's navigation guard. Deleting asks to confirm, or offers Undo.
- Motion respects `prefers-reduced-motion`.

## Search

Share search lives on `/shares`, and the record flow reuses it.

- Typing filters the shares stored in FPR. It costs no provider call.
- A full valid ISIN is sent to `POST /shares/lookup` by itself. Any other text offers a button that sends it.
- Each listing the lookup returns can be added. A listing without an ISIN asks for one.
- When the lookup finds nothing, "Create a manual share" opens the manual form with the ISIN filled in. The same offer appears when the lookup is unavailable.

## Languages

- Every interface text lives in `src/locales/en.json` and `src/locales/fr.json`. No text is written directly in a component.
- A signed-in person sees the language they chose in Settings. Until they choose, it follows the browser, as before sign-in.
- Before sign-in, pages use the first of the browser's languages (`navigator.languages`) that is English or French, otherwise French.
- Numbers, amounts, and dates are formatted with `Intl` for the current language: `1 234,56 €` in French, `€1,234.56` in English.
- The API sends codes and data, never sentences: errors as codes. The web app writes the words.

## Data

- Every API call goes through one client typed by `@fpr/contracts`, and every read through TanStack Query.
- In development and in Storybook, MSW can answer every route with mock responses built from the contracts, from invented fixtures validated against their schemas.
- A write invalidates the queries it affects. A portfolio write invalidates the portfolio, the log, the leaderboards, the members list, and the race chart.
- Screens showing prices refetch every 5 minutes while visible, and when the window regains focus. Prices change every 30 minutes at most, and each refetch reads Postgres only.
- Every price shows its time: "as of 14:30", or "close of 5 March".
- The race chart draws the points after the last close dashed, labelled "today, not final".
- A `401 access_ended` from any call signs the person out and shows "Your access has ended".

## Installable app

FPR is a Progressive Web App. It installs to a phone's home screen or a computer's dock, and opens full screen, without the browser's bars.

- `vite-plugin-pwa` generates the web app manifest and the service worker at build time.
- The manifest sets the app's name, `display: standalone`, `start_url: /`, `scope: /`, its theme and background colours from the design system, and its icons: 192 and 512 px, a 512 px maskable icon, and a 180 px Apple touch icon.
- The service worker precaches the app shell: the HTML, scripts, styles, fonts, and icons. It never caches `/api/*`. Data always comes from the API, and TanStack Query holds it in memory.
- Offline, the app still opens, and each screen shows "You're offline" with Retry.
- A new version installs in the background, then the app shows "A new version of FPR is ready" with Reload. It never reloads by itself.
- Installed, the top and bottom bars pad for the device's safe areas (`viewport-fit=cover` and `env(safe-area-inset-*)`), and the `theme-color` meta tag matches the top bar.
- An app installed on iOS keeps its own cookies, apart from Safari's, so its first launch shows sign-in. The sign-in page also accepts a pasted access link, which signs an anonymous viewer in, or opens the first-use steps of a waiting link.
- An access link opened from a message can open in the browser rather than the installed app. Both work.

## Roles

- The web app reads the role from `GET /me` and hides every control the role can't use. The API refuses those actions anyway.
- Anonymous viewers receive no euro amounts and no quantities, so every amount component also renders a percentage or a weight.
- Guests and anonymous viewers have no `/portfolio`. Anonymous viewers see `/admin/*` read-only.
- A person whose onboarding isn't finished is sent to `/onboarding` from every other screen.

## Serving

The web image builds the app and serves it with Caddy. Caddy serves `index.html` for every unknown path, so routes load directly, and forwards `/api/*` to the API. The browser sees one origin, and session cookies need no cross-site settings.

Caddy serves the service worker, `index.html`, and `manifest.webmanifest` with `Cache-Control: no-cache`, and the hashed build assets with a one-year `immutable` cache.

In development, Vite's dev server forwards `/api` to the local API in the same way.

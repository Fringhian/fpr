/**
 * Draws the app's icons into `public/icons/`: the wordmark in Figtree on the
 * sky, closed by the ridge, in the colours of `src/theme.css`, rendered by
 * Playwright's Chromium. `pnpm --filter @fpr/web icons` runs it again after
 * a change to the look.
 */
import { mkdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import { ridgePath, themeColor } from "./theme.ts";

type Icon = {
  file: string;
  size: number;
  /** Corner radius, as a share of the size: 0 for a full-bleed square the device masks itself. */
  radius: number;
  /** Wordmark width, as a share of the size: a maskable icon keeps it in the central safe circle. */
  mark: number;
};

const icons: Icon[] = [
  { file: "icon-64.png", size: 64, radius: 0.22, mark: 0.7 },
  { file: "icon-192.png", size: 192, radius: 0.22, mark: 0.6 },
  { file: "icon-512.png", size: 512, radius: 0.22, mark: 0.6 },
  { file: "icon-maskable-512.png", size: 512, radius: 0, mark: 0.48 },
  { file: "apple-touch-icon.png", size: 180, radius: 0, mark: 0.56 },
];

const font = readFileSync(
  fileURLToPath(
    import.meta.resolve(
      "@fontsource-variable/figtree/files/figtree-latin-wght-normal.woff2",
    ),
  ),
).toString("base64");

const ridge = `<svg viewBox="0 0 600 64" preserveAspectRatio="none">
  <path fill="${themeColor("ridge")}" d="${ridgePath("far")}"/>
  <path fill="${themeColor("page")}" d="${ridgePath("near")}"/>
</svg>`;

function page({ size, radius, mark }: Icon) {
  return `<!doctype html>
<style>
  @font-face { font-family: Figtree; src: url(data:font/woff2;base64,${font}) format("woff2"); font-weight: 300 900; }
  html, body { margin: 0; background: transparent; }
  #icon { position: relative; overflow: hidden; display: grid; place-items: center; width: ${size}px; height: ${size}px; border-radius: ${radius * size}px; background: ${themeColor("sky")}; }
  #mark { font: 600 ${(mark * size) / 2.1}px/1 Figtree; letter-spacing: 0.08em; margin: 0 -0.08em -${0.1 * size}px 0; color: ${themeColor("primary")}; }
  svg { position: absolute; inset: auto 0 0; width: 100%; height: ${0.3 * size}px; }
</style>
<div id="icon"><span id="mark">FPR</span>${ridge}</div>`;
}

const out = new URL("../public/icons/", import.meta.url);
mkdirSync(out, { recursive: true });
const browser = await chromium.launch();
const tab = await browser.newPage();
for (const icon of icons) {
  await tab.setContent(page(icon));
  await tab.evaluate("document.fonts.ready.then(() => true)");
  await tab.locator("#icon").screenshot({
    path: fileURLToPath(new URL(icon.file, out)),
    omitBackground: true,
  });
}
await browser.close();

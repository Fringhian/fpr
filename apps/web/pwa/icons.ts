/**
 * Draws the app's icons into `public/icons/`: F, P and R in Rubik Black, in
 * cobalt, vermilion and green on cream, the colours of `src/theme.css`,
 * rendered by Playwright's Chromium. The favicons a tab shows at 16 px keep
 * the cobalt F alone. `pnpm --filter @fpr/web icons` runs it again after a
 * change to the look.
 */
import { mkdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import { paletteColor, themeColor } from "./theme.ts";

type Icon = {
  file: string;
  size: number;
  mark: "letters" | "initial";
  /** Corner radius in the 100-unit square: 0 for a full bleed the device masks itself. */
  radius: number;
  /** The letters' scale round the centre: a maskable icon keeps them in the central safe circle. */
  scale: number;
};

const icons: Icon[] = [
  { file: "icon-16.png", size: 16, mark: "initial", radius: 22, scale: 1 },
  { file: "icon-32.png", size: 32, mark: "initial", radius: 22, scale: 1 },
  { file: "icon-64.png", size: 64, mark: "letters", radius: 22, scale: 1 },
  { file: "icon-192.png", size: 192, mark: "letters", radius: 22, scale: 1 },
  { file: "icon-512.png", size: 512, mark: "letters", radius: 22, scale: 1 },
  {
    file: "icon-maskable-512.png",
    size: 512,
    mark: "letters",
    radius: 0,
    scale: 0.8,
  },
  {
    file: "apple-touch-icon.png",
    size: 180,
    mark: "letters",
    radius: 0,
    scale: 1,
  },
];

const font = readFileSync(
  fileURLToPath(
    import.meta.resolve("@fontsource/rubik/files/rubik-latin-900-normal.woff2"),
  ),
).toString("base64");

const marks = {
  letters: `<g font-size="38">
    <text x="25" y="64" fill="${themeColor("cobalt")}">F</text>
    <text x="50" y="64" fill="${themeColor("vermilion")}">P</text>
    <text x="76" y="64" fill="${themeColor("green")}">R</text>
  </g>`,
  initial: `<text x="50" y="80" font-size="80" fill="${themeColor("cobalt")}">F</text>`,
};

function page({ size, mark, radius, scale }: Icon) {
  return `<!doctype html>
<style>
  @font-face { font-family: Rubik; src: url(data:font/woff2;base64,${font}) format("woff2"); font-weight: 900; }
  html, body { margin: 0; background: transparent; }
  svg { display: block; }
  text { font-family: Rubik; font-weight: 900; text-anchor: middle; }
</style>
<svg id="icon" width="${size}" height="${size}" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
  <rect width="100" height="100" rx="${radius}" fill="${paletteColor("blush")}"/>
  <g transform="translate(50 50) scale(${scale}) translate(-50 -50)">${marks[mark]}</g>
</svg>`;
}

const out = new URL("../public/icons/", import.meta.url);
mkdirSync(out, { recursive: true });
const browser = await chromium.launch();
const tab = await browser.newPage();
for (const icon of icons) {
  await tab.setContent(page(icon));
  await tab.evaluate('document.fonts.load("900 1em Rubik").then(() => true)');
  await tab.locator("#icon").screenshot({
    path: fileURLToPath(new URL(icon.file, out)),
    omitBackground: true,
  });
}
await browser.close();

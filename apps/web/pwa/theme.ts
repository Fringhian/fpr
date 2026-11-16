/**
 * Values of `src/theme.css`, the one place the look is defined, for what the
 * build writes outside the styles: the manifest, the `theme-color` meta tag
 * and the icons.
 */
import { readFileSync } from "node:fs";

const theme = readFileSync(
  new URL("../src/theme.css", import.meta.url),
  "utf-8",
);

function find(pattern: string, what: string): string {
  const value = theme.match(new RegExp(pattern))?.[1];
  if (value === undefined) {
    throw new Error(`theme.css has no ${what}`);
  }
  return value;
}

/** A palette hue, such as `blush` for `--palette-blush`, as its hex value. */
export function paletteColor(hue: string): string {
  return find(`--palette-${hue}:\\s*(#[0-9a-f]{6})`, `--palette-${hue}`);
}

/**
 * A colour token, such as `page` for `--color-page` or `cobalt` for
 * `--color-cobalt`, as its hex value: its own, or that of the palette hue it
 * points at.
 */
export function themeColor(role: string): string {
  const value = find(
    `--color-${role}:\\s*(#[0-9a-f]{6}|var\\(--palette-[a-z-]+\\))`,
    `--color-${role}`,
  );
  const hue = value.match(/^var\(--palette-([a-z-]+)\)$/)?.[1];
  return hue === undefined ? value : paletteColor(hue);
}

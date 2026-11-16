import { readFileSync } from "node:fs";

/**
 * Values of `src/theme.css`, the one place the look is defined, for what the
 * build writes outside the styles: the manifest, the `theme-color` meta tag
 * and the icons.
 */
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

/** A colour role, such as `page` for `--color-page`, as the hex value of the palette hue it points at. */
export function themeColor(role: string): string {
  const hue = find(
    `--color-${role}:\\s*var\\(--palette-([a-z-]+)\\)`,
    `--color-${role}`,
  );
  return find(`--palette-${hue}:\\s*(#[0-9a-f]{6})`, `--palette-${hue}`);
}

/** The path of one layer of the ridge's 600 × 64 tile. */
export function ridgePath(layer: "far" | "near"): string {
  return find(`--ridge-${layer}:[^;]*?d='([^']+)'`, `--ridge-${layer}`);
}

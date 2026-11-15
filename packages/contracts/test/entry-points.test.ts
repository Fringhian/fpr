/// <reference types="node" />
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const src = new URL("../src/", import.meta.url);

/**
 * The modules a source file loads when it runs, relative to `src/`, such as
 * `api/me/profile.ts`, and the packages, such as `zod`. Type-only imports and
 * exports are left out: they are gone once compiled.
 */
function runtimeImports(source: string): string[] {
  return [
    ...source.matchAll(
      /^(?:import|export)\s+(?!type\s)[^;]*?from\s+"([^"]+)"/gm,
    ),
  ].map(([, specifier]) => specifier as string);
}

/** Every module an entry point loads, itself included. */
function loadedBy(entry: string): Set<string> {
  const loaded = new Set<string>();
  const visit = (file: string) => {
    if (loaded.has(file)) {
      return;
    }
    loaded.add(file);
    if (!file.endsWith(".ts")) {
      return;
    }
    const source = readFileSync(new URL(file, src), "utf8");
    for (const specifier of runtimeImports(source)) {
      visit(
        specifier.startsWith(".")
          ? new URL(specifier, new URL(file, src)).href
              .slice(src.href.length)
              .replace(/\.js$/, ".ts")
          : specifier,
      );
    }
  };
  visit(entry);
  return loaded;
}

/** Whether a set of loaded modules holds the OpenAPI generator. */
const holdsTheGenerator = (loaded: string[]) =>
  loaded.includes("openapi.ts") ||
  loaded.some((file) => file.startsWith("@orpc/openapi"));

describe("the entry points", () => {
  it("@fpr/contracts loads the API's routes, and neither the price service's routes nor the generator", () => {
    const loaded = [...loadedBy("index.ts")];
    expect(loaded).toContain("api/race/leaderboards.ts");
    expect(loaded.filter((file) => file.startsWith("prices/"))).toEqual([]);
    expect(holdsTheGenerator(loaded)).toBe(false);
  });

  it("@fpr/contracts/prices loads its routes, and not the generator", () => {
    const loaded = [...loadedBy("prices/index.ts")];
    expect(loaded).toContain("prices/shares.ts");
    expect(holdsTheGenerator(loaded)).toBe(false);
  });
});

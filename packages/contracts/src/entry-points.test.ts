/// <reference types="node" />
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const src = new URL("./", import.meta.url);

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

describe("the root entry point, @fpr/contracts", () => {
  const loaded = [...loadedBy("index.ts")];

  it("loads the API's routes", () => {
    expect(loaded).toContain("api/index.ts");
    expect(loaded).toContain("api/race/leaderboards.ts");
  });

  it("loads neither the price service's routes nor the OpenAPI generator", () => {
    expect(loaded.filter((file) => file.startsWith("prices/"))).toEqual([]);
    expect(loaded).not.toContain("openapi.ts");
    expect(loaded.some((file) => file.startsWith("@orpc/openapi"))).toBe(false);
  });
});

describe("@fpr/contracts/prices", () => {
  it("loads its routes, and not the OpenAPI generator", () => {
    const loaded = [...loadedBy("prices/index.ts")];
    expect(loaded).toContain("prices/shares.ts");
    expect(loaded).not.toContain("openapi.ts");
    expect(loaded.some((file) => file.startsWith("@orpc/openapi"))).toBe(false);
  });
});

describe("@fpr/contracts/openapi", () => {
  it("loads the generator and the API's routes", () => {
    const loaded = [...loadedBy("openapi.ts")];
    expect(loaded).toContain("@orpc/openapi");
    expect(loaded).toContain("api/index.ts");
  });
});

describe("runtimeImports", () => {
  it("keeps value imports and exports, and drops type-only ones", () => {
    const source = [
      'import { z } from "zod";',
      'import type { Role } from "./roles.js";',
      'import {\n  type Access,\n  publicRoute,\n} from "./contract.js";',
      'export type * from "./prices/index.js";',
      'export { apiContract } from "./api/index.js";',
    ].join("\n");
    expect(runtimeImports(source)).toEqual([
      "zod",
      "./contract.js",
      "./api/index.js",
    ]);
  });
});

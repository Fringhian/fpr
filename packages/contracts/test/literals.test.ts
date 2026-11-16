/// <reference types="node" />
import { readdirSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  accessKeyStates,
  accessSignInMethods,
} from "../src/api/access/access-keys.js";
import { adminAccessStatuses } from "../src/api/admin/people.js";
import { shareValueActions } from "../src/api/shares/values.js";
import { roles } from "../src/roles.js";
import {
  languages,
  leaderboardBoards,
  periods,
  priceSources,
  shareKinds,
  units,
} from "../src/values.js";

/** Each shared list, and the file that defines it, relative to `src/`. */
const lists: [values: readonly string[], definedIn: string][] = [
  [roles, "roles.ts"],
  [periods, "values.ts"],
  [units, "values.ts"],
  [leaderboardBoards, "values.ts"],
  [shareKinds, "values.ts"],
  [priceSources, "values.ts"],
  [shareValueActions, "api/shares/values.ts"],
  [accessKeyStates, "api/access/access-keys.ts"],
  [accessSignInMethods, "api/access/access-keys.ts"],
  [adminAccessStatuses, "api/admin/people.ts"],
  [languages, "values.ts"],
];

/**
 * The values of a shared list that a file's code writes as string literals,
 * comments aside. A file that defines a list may write its values, so a value
 * two lists share, such as `waiting`, may be written in either file.
 */
function literalsOutsideTheirList(file: string, source: string): string[] {
  const code = source
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/(^|\s)\/\/.*$/gm, "$1");
  const written = new Set(
    [...code.matchAll(/"([^"\n]*)"|'([^'\n]*)'|`([^`]*)`/g)].map(
      ([, double, single, template]) => double ?? single ?? template,
    ),
  );
  const definedHere = new Set(
    lists.flatMap(([values, definedIn]) => (definedIn === file ? values : [])),
  );
  const values = new Set(lists.flatMap(([values]) => values));
  return [...values].filter(
    (value) => written.has(value) && !definedHere.has(value),
  );
}

const src = new URL("../src/", import.meta.url);

/** Every source file under `src/`, relative to `src/`. */
const sourceFiles = readdirSync(src, { recursive: true, encoding: "utf8" })
  .filter((file) => file.endsWith(".ts"))
  .map((file) => file.replaceAll("\\", "/"));

describe("a shared list's values", () => {
  it.each(sourceFiles)("are referenced from their list in %s", (file) => {
    const source = readFileSync(new URL(file, src), "utf8");
    expect(literalsOutsideTheirList(file, source)).toEqual([]);
  });
});

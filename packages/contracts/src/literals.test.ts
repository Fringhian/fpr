/// <reference types="node" />
import { readdirSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { accessKeyStates, accessSignInMethods } from "./api/access/index.js";
import { adminAccessStatuses } from "./api/admin/index.js";
import { languages } from "./api/me/index.js";
import { leaderboardBoards } from "./api/race/index.js";
import { shareValueActions } from "./api/shares/index.js";
import { periods, units } from "./period.js";
import { roles } from "./roles.js";
import { priceSources, shareKinds } from "./schemas/share.js";

/** Each shared list, and the file that defines it, relative to `src/`. */
const lists: [values: readonly string[], definedIn: string][] = [
  [roles, "roles.ts"],
  [periods, "period.ts"],
  [units, "period.ts"],
  [leaderboardBoards, "api/race/leaderboards.ts"],
  [shareKinds, "schemas/share.ts"],
  [priceSources, "schemas/share.ts"],
  [shareValueActions, "api/shares/values.ts"],
  [accessKeyStates, "api/access/access-keys.ts"],
  [accessSignInMethods, "api/access/access-keys.ts"],
  [adminAccessStatuses, "api/admin/people.ts"],
  [languages, "api/me/profile.ts"],
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

const src = new URL("./", import.meta.url);

/** Every source file under `src/` but the tests, relative to `src/`. */
const sourceFiles = readdirSync(src, { recursive: true, encoding: "utf8" })
  .filter((file) => file.endsWith(".ts") && !file.endsWith(".test.ts"))
  .map((file) => file.replaceAll("\\", "/"));

describe("a shared list's values", () => {
  it.each(sourceFiles)("are referenced from their list in %s", (file) => {
    const source = readFileSync(new URL(file, src), "utf8");
    expect(literalsOutsideTheirList(file, source)).toEqual([]);
  });

  it("are found when written as a literal outside their list", () => {
    const source = 'signedInRoute(["admin"]).input(z.literal(`percent`));';
    expect(literalsOutsideTheirList("api/me/profile.ts", source)).toEqual([
      "admin",
      "percent",
    ]);
  });

  it("may be written in their own list's file, and in comments", () => {
    expect(literalsOutsideTheirList("roles.ts", '["admin", "guest"]')).toEqual(
      [],
    );
    const comments = '/** `"admin"` only. */\n// "member" too\nconst a = 1;';
    expect(literalsOutsideTheirList("contract.ts", comments)).toEqual([]);
  });
});

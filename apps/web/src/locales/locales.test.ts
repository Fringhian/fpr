import { describe, expect, it } from "vitest";
import en from "./en.json";
import fr from "./fr.json";

type Texts = { readonly [key: string]: string | Texts };

/** i18next's plural suffixes: each language has the forms its grammar needs. */
const PLURAL = /_(?:zero|one|two|few|many|other)$/;

/**
 * Every key path of a texts file, nested keys joined with dots, each plural
 * form read as its base key. A path ending in `{}` is a group.
 */
function keyPaths(texts: Texts, prefix = ""): Set<string> {
  const paths = new Set<string>();
  for (const [key, value] of Object.entries(texts)) {
    const path = `${prefix}${key.replace(PLURAL, "")}`;
    if (typeof value === "string") {
      paths.add(path);
    } else {
      paths.add(`${path}{}`);
      for (const nested of keyPaths(value, `${path}.`)) {
        paths.add(nested);
      }
    }
  }
  return paths;
}

/** The keys of `from` that `to` lacks, or holds as a text where `from` has a group, or the reverse. */
function missingKeys(from: Texts, to: Texts): string[] {
  const toPaths = keyPaths(to);
  return [...keyPaths(from)].filter((path) => !toPaths.has(path));
}

/** Every text of a file, with its key path. */
function texts(file: Texts, prefix = ""): [string, string][] {
  return Object.entries(file).flatMap(([key, value]) =>
    typeof value === "string"
      ? [[`${prefix}${key}`, value]]
      : texts(value, `${prefix}${key}.`),
  );
}

describe("missingKeys", () => {
  it("finds a key missing at the top and deep down", () => {
    const full = { a: "A", b: { c: "C", d: { e: "E" } } };
    expect(missingKeys(full, { a: "A", b: { c: "C", d: {} } })).toEqual([
      "b.d.e",
    ]);
    expect(missingKeys(full, { b: { c: "C", d: { e: "E" } } })).toEqual(["a"]);
  });

  it("finds a group written as a text", () => {
    expect(missingKeys({ a: { b: "B" } }, { a: "A" })).toEqual(["a{}", "a.b"]);
  });

  it("reads plural forms as their base key", () => {
    expect(
      missingKeys(
        { units_one: "{{count}} unit", units_other: "{{count}} units" },
        {
          units_one: "{{count}} part",
          units_many: "{{count}} de parts",
          units_other: "{{count}} parts",
        },
      ),
    ).toEqual([]);
  });
});

describe("the locales", () => {
  it("have the same keys in English and French", () => {
    expect(missingKeys(en, fr), "keys missing from fr.json").toEqual([]);
    expect(missingKeys(fr, en), "keys missing from en.json").toEqual([]);
  });

  it("use typographic quotes, apostrophes, and ellipses", () => {
    for (const [key, text] of [...texts(en), ...texts(fr)]) {
      expect(text, key).not.toMatch(/["']|\.\.\./);
    }
  });

  it("use curly quotes in English", () => {
    for (const [key, text] of texts(en)) {
      expect(text, key).not.toMatch(/[«»]/);
    }
  });

  it("put a narrow no-break space before ; : ! ? » and after « in French", () => {
    for (const [key, text] of texts(fr)) {
      // A colon between digits is a time, such as 14:30.
      const prose = text.replace(/\d:\d/g, "");
      expect(prose, key).not.toMatch(/(?<!\u202F)[;:!?»]|«(?!\u202F)/);
    }
  });
});

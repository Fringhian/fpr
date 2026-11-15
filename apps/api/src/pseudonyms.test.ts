import { describe, expect, it } from "vitest";
import { ADJECTIVES, ANIMALS } from "./pseudonym-words.js";
import { basePseudonym, pseudonyms } from "./pseudonyms.js";

const secret = "test-pseudonym-secret-0123456789abcdef";

/** The nth UUIDv7-shaped id: a larger n sorts later. */
function userId(n: number): string {
  return `019a0000-0000-7000-8000-${n.toString(16).padStart(12, "0")}`;
}

/** The first `size` ids that share one base pseudonym under `secret`. */
function sameBase(size: number): string[] {
  const byBase = new Map<string, string[]>();
  for (let n = 0; n < 100_000; n++) {
    const id = userId(n);
    const base = basePseudonym(secret, id);
    const ids = [...(byBase.get(base) ?? []), id];
    if (ids.length === size) {
      return ids;
    }
    byBase.set(base, ids);
  }
  throw new Error(`No ${size} ids share a pseudonym`);
}

describe("word lists", () => {
  it("fit the longest pseudonym, with a suffix, in a 40-character display name", () => {
    const longest = (words: readonly string[]) =>
      Math.max(...words.map((word) => word.length));
    expect(
      longest(ADJECTIVES) + 1 + longest(ANIMALS) + " 999".length,
    ).toBeLessThanOrEqual(40);
  });
});

describe("pseudonyms", () => {
  it("depend on the secret", () => {
    const ids = Array.from({ length: 20 }, (_, n) => userId(n));
    const withOther = ids.map((id) => basePseudonym("another-secret", id));
    const withSecret = ids.map((id) => basePseudonym(secret, id));
    expect(withOther).not.toEqual(withSecret);
  });

  it("give a person without a twin their base pseudonym, whoever else is listed", () => {
    const [first, second] = sameBase(2) as [string, string];
    const alone = userId(200_000);
    expect(pseudonyms(secret, [alone]).get(alone)).toBe(
      basePseudonym(secret, alone),
    );
    expect(pseudonyms(secret, [first, second, alone]).get(alone)).toBe(
      basePseudonym(secret, alone),
    );
  });

  it("number people with the same pseudonym from the second, by id", () => {
    const ids = sameBase(3) as [string, string, string];
    const base = basePseudonym(secret, ids[0]);
    const result = pseudonyms(secret, [ids[2], ids[0], ids[1]]);
    expect(result.get(ids[0])).toBe(base);
    expect(result.get(ids[1])).toBe(`${base} 2`);
    expect(result.get(ids[2])).toBe(`${base} 3`);
  });

  it("give every person a different pseudonym", () => {
    const ids = Array.from({ length: 500 }, (_, n) => userId(n));
    const result = pseudonyms(secret, ids);
    expect(result.size).toBe(500);
    expect(new Set(result.values()).size).toBe(500);
  });
});

import { describe, expect, it } from "vitest";
import { initialOf } from "./initial";

describe("initialOf", () => {
  it("is the first letter, upper-cased", () => {
    expect(initialOf("sam", "en")).toBe("S");
    expect(initialOf("Lea", "fr")).toBe("L");
  });

  it("skips leading spaces", () => {
    expect(initialOf("  Noor", "en")).toBe("N");
  });

  it("keeps an accented letter whole, even decomposed", () => {
    expect(initialOf("élodie", "fr")).toBe("É");
    expect(initialOf("élodie", "fr")).toBe("É");
  });

  it("keeps an emoji whole", () => {
    expect(initialOf("👩‍🚀 Ada", "en")).toBe("👩‍🚀");
  });

  it("is empty for an empty name", () => {
    expect(initialOf("", "en")).toBe("");
    expect(initialOf("   ", "en")).toBe("");
  });
});

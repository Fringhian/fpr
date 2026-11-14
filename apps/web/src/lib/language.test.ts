import { describe, expect, it } from "vitest";
import { isLanguage, pickLanguage } from "./language";

describe("pickLanguage", () => {
  it("takes the first of the reader's languages FPR is written in", () => {
    expect(pickLanguage(["de-DE", "en-US", "fr-FR"])).toBe("en");
    expect(pickLanguage(["fr-CA", "en"])).toBe("fr");
  });

  it("reads the primary subtag, in any case", () => {
    expect(pickLanguage(["EN-gb"])).toBe("en");
  });

  it("falls back to French", () => {
    expect(pickLanguage(["de", "es"])).toBe("fr");
    expect(pickLanguage([])).toBe("fr");
  });
});

describe("isLanguage", () => {
  it("accepts the bare codes only", () => {
    expect(isLanguage("en")).toBe(true);
    expect(isLanguage("fr")).toBe(true);
    expect(isLanguage("en-GB")).toBe(false);
    expect(isLanguage("de")).toBe(false);
  });
});

import { describe, expect, it } from "vitest";
import { anonymizeKind } from "../anonymize.js";
import { personSchema } from "./person.js";
import { isinSchema } from "./share.js";
import { dateSchema, timestampSchema } from "./time.js";

describe("isinSchema", () => {
  it.each(["FR0000120271", "US0378331005", "IE00B4L5Y983"])(
    "accepts %s",
    (isin) => {
      expect(isinSchema.safeParse(isin).success).toBe(true);
    },
  );

  it.each(["fr0000120271", "FR000012027", "FR00001202711", "FR000012027X", ""])(
    "refuses %j",
    (isin) => {
      expect(isinSchema.safeParse(isin).success).toBe(false);
    },
  );
});

describe("timestampSchema", () => {
  it("accepts a moment with its offset or Z", () => {
    expect(timestampSchema.safeParse("2026-03-02T17:30:00+01:00").success).toBe(
      true,
    );
    expect(timestampSchema.safeParse("2026-03-02T16:30:00Z").success).toBe(
      true,
    );
  });

  it("refuses a day alone or a moment without offset", () => {
    expect(timestampSchema.safeParse("2026-03-02").success).toBe(false);
    expect(timestampSchema.safeParse("2026-03-02T17:30:00").success).toBe(
      false,
    );
  });
});

describe("dateSchema", () => {
  it("accepts a day and refuses a moment", () => {
    expect(dateSchema.safeParse("2026-03-02").success).toBe(true);
    expect(dateSchema.safeParse("2026-03-02T17:30:00Z").success).toBe(false);
  });
});

describe("personSchema", () => {
  it("marks the name and picture personal, and keeps the colour", () => {
    expect(anonymizeKind(personSchema.shape.displayName)).toBe("personal");
    expect(anonymizeKind(personSchema.shape.avatarUrl)).toBe("personal");
    expect(anonymizeKind(personSchema.shape.color)).toBeUndefined();
  });
});

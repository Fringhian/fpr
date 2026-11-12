import { describe, expect, it } from "vitest";
import { adminResetKeyResultSchema } from "./access.js";

describe("adminResetKeyResultSchema", () => {
  const result = {
    resetKey: "c2VjcmV0LXJlc2V0LWtleS1mb3ItdGVzdHM",
    expiresAt: "2026-03-03T17:30:00+01:00",
  };

  it("accepts a key with its expiry, and refuses an empty key or a day alone", () => {
    expect(adminResetKeyResultSchema.parse(result)).toEqual(result);
    expect(
      adminResetKeyResultSchema.safeParse({ ...result, resetKey: "" }).success,
    ).toBe(false);
    expect(
      adminResetKeyResultSchema.safeParse({
        ...result,
        expiresAt: "2026-03-03",
      }).success,
    ).toBe(false);
  });
});

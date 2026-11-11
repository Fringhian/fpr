import { describe, expect, it } from "vitest";
import { anonymizeKind } from "../../anonymize.js";
import { adminResetKeyResultSchema } from "./access.js";
import { adminContract } from "./index.js";

const id = "0b6f3c1e-8a2d-4c7e-9f10-2b3c4d5e6f70";

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

  it("leaves the key unmarked: it goes to the admin only", () => {
    expect(
      anonymizeKind(adminResetKeyResultSchema.shape.resetKey),
    ).toBeUndefined();
  });
});

describe.each(["revoke", "restore", "replaceLink", "resetKey"] as const)(
  "admin.%s input",
  (key) => {
    const input = adminContract[key]["~orpc"].inputSchema;

    it("takes the person's id, and refuses anything else", () => {
      expect(input?.["~standard"].validate({ id })).toEqual({ value: { id } });
      expect(input?.["~standard"].validate({ id: "alex" })).toHaveProperty(
        "issues",
      );
    });
  },
);

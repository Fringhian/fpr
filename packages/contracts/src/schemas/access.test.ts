import { describe, expect, it } from "vitest";
import { accessKeySchema, passwordSchema, resetKeySchema } from "./access.js";

/** 32 bytes in base64url: 43 characters. */
const key = "dGhpcy1pcy1hbi1pbnZlbnRlZC1hY2Nlc3Mta2V5LTA";

describe("passwordSchema", () => {
  it("accepts 12 to 128 characters", () => {
    expect(passwordSchema.safeParse("a".repeat(12)).success).toBe(true);
    expect(passwordSchema.safeParse("a".repeat(128)).success).toBe(true);
  });

  it("refuses under 12 or over 128 characters", () => {
    expect(passwordSchema.safeParse("a".repeat(11)).success).toBe(false);
    expect(passwordSchema.safeParse("a".repeat(129)).success).toBe(false);
  });
});

describe("accessKeySchema", () => {
  it("accepts 43 base64url characters", () => {
    expect(accessKeySchema.safeParse(key).success).toBe(true);
    expect(accessKeySchema.safeParse(`${key.slice(0, 41)}-_`).success).toBe(
      true,
    );
  });

  it.each([
    ["a shorter key", key.slice(1)],
    ["a longer key", `${key}A`],
    ["padding", `${key.slice(1)}=`],
    ["base64 characters", `${key.slice(2)}+/`],
    ["an empty key", ""],
  ])("refuses %s", (_, value) => {
    expect(accessKeySchema.safeParse(value).success).toBe(false);
  });
});

describe("resetKeySchema", () => {
  it("accepts a key and refuses an empty one", () => {
    expect(resetKeySchema.safeParse("an-invented-reset-key").success).toBe(
      true,
    );
    expect(resetKeySchema.safeParse("").success).toBe(false);
  });
});

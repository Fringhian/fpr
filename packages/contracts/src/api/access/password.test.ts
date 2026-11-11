import { describe, expect, it } from "vitest";
import { passwordSchema } from "./password.js";

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

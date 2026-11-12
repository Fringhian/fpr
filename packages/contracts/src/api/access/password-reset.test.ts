import { describe, expect, it } from "vitest";
import {
  type PasswordResetBody,
  passwordResetBodySchema,
  passwordResetCheckBodySchema,
} from "./password-reset.js";

const body: PasswordResetBody = {
  email: "alex.martin@example.com",
  key: "example-reset-key",
  password: "correct horse battery",
};

describe("POST /password-reset/check", () => {
  it("takes the email and reset key", () => {
    const { password: _, ...pair } = body;
    expect(passwordResetCheckBodySchema.parse(pair)).toEqual(pair);
  });

  it.each([
    ["an invalid email", { email: "alex.martin" }],
    ["an empty key", { key: "" }],
  ])("refuses %s", (_, change) => {
    expect(
      passwordResetCheckBodySchema.safeParse({ ...body, ...change }).success,
    ).toBe(false);
  });
});

describe("POST /password-reset", () => {
  it("takes the pair and the new password", () => {
    expect(passwordResetBodySchema.parse(body)).toEqual(body);
  });

  it.each([
    ["a password under 12 characters", { password: "short" }],
    ["a missing password", { password: undefined }],
    ["an invalid email", { email: "alex.martin" }],
  ])("refuses %s", (_, change) => {
    expect(
      passwordResetBodySchema.safeParse({ ...body, ...change }).success,
    ).toBe(false);
  });
});

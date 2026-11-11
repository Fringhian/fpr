import { describe, expect, it } from "vitest";
import { anonymizeKind } from "../../anonymize.js";
import { createOpenApiDocument } from "../../openapi.js";
import {
  checkPasswordReset,
  type PasswordResetBody,
  passwordResetBodySchema,
  passwordResetCheckBodySchema,
  resetPassword,
} from "./password-reset.js";

const body: PasswordResetBody = {
  email: "alex.martin@example.com",
  key: "example-reset-key",
  password: "correct horse battery",
};

const refusals = [
  "forbidden",
  "internal_error",
  "invalid_request",
  "invalid_reset_key",
  "rate_limited",
].sort();

describe("POST /password-reset/check", () => {
  it("is public, answers 204, and declares each refusal", () => {
    const { route, meta, errorMap } = checkPasswordReset["~orpc"];
    expect(route).toMatchObject({
      method: "POST",
      path: "/password-reset/check",
      successStatus: 204,
    });
    expect(meta.roles).toBe("public");
    expect(Object.keys(errorMap).sort()).toEqual(refusals);
  });

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

  it("marks the email personal", () => {
    expect(anonymizeKind(passwordResetCheckBodySchema.shape.email)).toBe(
      "personal",
    );
  });
});

describe("POST /password-reset", () => {
  it("is public, answers 204, and declares each refusal", () => {
    const { route, meta, errorMap } = resetPassword["~orpc"];
    expect(route).toMatchObject({
      method: "POST",
      path: "/password-reset",
      successStatus: 204,
    });
    expect(meta.roles).toBe("public");
    expect(Object.keys(errorMap).sort()).toEqual(refusals);
  });

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

  it("marks the email personal", () => {
    expect(anonymizeKind(passwordResetBodySchema.shape.email)).toBe("personal");
  });
});

describe("the OpenAPI document", () => {
  it("lists the password reset routes, with their statuses", async () => {
    const paths = (await createOpenApiDocument()).paths;
    for (const [path, operationId] of [
      ["/password-reset/check", "access.checkReset"],
      ["/password-reset", "access.reset"],
    ] as const) {
      const operation = paths?.[path]?.post;
      expect(operation).toMatchObject({
        operationId,
        "x-roles": "public",
        responses: { "422": { description: "`invalid_reset_key`" } },
      });
      expect(Object.keys(operation?.responses ?? {}).sort()).toEqual([
        "204",
        "400",
        "403",
        "422",
        "429",
        "500",
      ]);
    }
  });
});

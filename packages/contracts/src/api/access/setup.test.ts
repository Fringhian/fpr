import { describe, expect, it } from "vitest";
import { anonymizeKind } from "../../anonymize.js";
import { createOpenApiDocument } from "../../openapi.js";
import {
  getSetupStatus,
  type SetupBody,
  setUpFirstAdmin,
  setupBodySchema,
  setupStatusSchema,
} from "./setup.js";

const body: SetupBody = {
  bootstrapKey: "example-bootstrap-key",
  email: "alex.martin@example.com",
  displayName: "Alex Martin",
  password: "correct horse battery",
};

describe("GET /setup", () => {
  it("is public, with no input", () => {
    const { route, meta, errorMap, inputSchema } = getSetupStatus["~orpc"];
    expect(route).toMatchObject({ method: "GET", path: "/setup" });
    expect(meta.roles).toBe("public");
    expect(inputSchema).toBeUndefined();
    expect(Object.keys(errorMap)).toEqual(["internal_error"]);
  });

  it("says whether an admin exists", () => {
    expect(setupStatusSchema.parse({ adminExists: false })).toEqual({
      adminExists: false,
    });
    expect(setupStatusSchema.safeParse({}).success).toBe(false);
  });
});

describe("POST /setup", () => {
  it("is public, answers 201, and declares each refusal", () => {
    const { route, meta, errorMap } = setUpFirstAdmin["~orpc"];
    expect(route).toMatchObject({
      method: "POST",
      path: "/setup",
      successStatus: 201,
    });
    expect(meta.roles).toBe("public");
    expect(Object.keys(errorMap).sort()).toEqual(
      [
        "admin_exists",
        "forbidden",
        "internal_error",
        "invalid_bootstrap_key",
        "invalid_request",
        "rate_limited",
      ].sort(),
    );
  });

  it("accepts the first admin", () => {
    expect(setupBodySchema.parse(body)).toEqual(body);
  });

  it.each([
    ["an empty bootstrap key", { bootstrapKey: "" }],
    ["an invalid email", { email: "alex.martin" }],
    ["an empty display name", { displayName: "" }],
    ["a display name over 40 characters", { displayName: "a".repeat(41) }],
    ["a password under 12 characters", { password: "short" }],
  ])("refuses %s", (_, change) => {
    expect(setupBodySchema.safeParse({ ...body, ...change }).success).toBe(
      false,
    );
  });

  it("refuses a missing field", () => {
    const { password: _, ...withoutPassword } = body;
    expect(setupBodySchema.safeParse(withoutPassword).success).toBe(false);
  });

  it("marks the email and display name personal", () => {
    expect(anonymizeKind(setupBodySchema.shape.email)).toBe("personal");
    expect(anonymizeKind(setupBodySchema.shape.displayName)).toBe("personal");
    expect(anonymizeKind(setupBodySchema.shape.password)).toBeUndefined();
  });

  it("is in the OpenAPI document, with its statuses", async () => {
    const paths = (await createOpenApiDocument()).paths;
    expect(paths?.["/setup"]?.get).toMatchObject({
      operationId: "access.setupStatus",
      "x-roles": "public",
    });
    const operation = paths?.["/setup"]?.post;
    expect(operation).toMatchObject({
      operationId: "access.setup",
      "x-roles": "public",
      responses: {
        "409": { description: "`admin_exists`" },
        "422": { description: "`invalid_bootstrap_key`" },
      },
    });
    expect(Object.keys(operation?.responses ?? {}).sort()).toEqual([
      "201",
      "400",
      "403",
      "409",
      "422",
      "429",
      "500",
    ]);
  });
});

import { describe, expect, it } from "vitest";
import { type SetupBody, setupBodySchema, setupStatusSchema } from "./setup.js";

const body: SetupBody = {
  bootstrapKey: "example-bootstrap-key",
  email: "alex.martin@example.com",
  displayName: "Alex Martin",
  password: "correct horse battery",
};

describe("GET /setup", () => {
  it("says whether an admin exists", () => {
    expect(setupStatusSchema.parse({ adminExists: false })).toEqual({
      adminExists: false,
    });
    expect(setupStatusSchema.safeParse({}).success).toBe(false);
  });
});

describe("POST /setup", () => {
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

  it("trims the display name", () => {
    expect(
      setupBodySchema.parse({ ...body, displayName: "  Alex Martin " })
        .displayName,
    ).toBe("Alex Martin");
    expect(
      setupBodySchema.safeParse({ ...body, displayName: "   " }).success,
    ).toBe(false);
  });
});

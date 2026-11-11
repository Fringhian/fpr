import { describe, expect, it } from "vitest";
import { anonymizeKind } from "../anonymize.js";
import { createOpenApiDocument } from "../openapi.js";
import { getMe, type Me, meSchema } from "./me.js";

const me: Me = {
  id: "0b6f3c1e-8a2d-4c7e-9f10-2b3c4d5e6f70",
  role: "member",
  displayName: "Alex Martin",
  avatarUrl: null,
  color: 3,
  language: null,
  onboarded: false,
};

describe("GET /me", () => {
  it("is declared for every signed-in role, with the session codes", () => {
    const { route, meta, errorMap } = getMe["~orpc"];
    expect(route).toMatchObject({ method: "GET", path: "/me" });
    expect(meta.roles).toEqual(["admin", "member", "guest", "anonymous"]);
    expect(Object.keys(errorMap).sort()).toEqual(
      ["access_ended", "internal_error", "unauthenticated"].sort(),
    );
  });

  it("accepts the signed-in person, and refuses a colour or name out of range", () => {
    expect(meSchema.parse(me)).toEqual(me);
    expect(meSchema.safeParse({ ...me, color: 11 }).success).toBe(false);
    expect(meSchema.safeParse({ ...me, displayName: "" }).success).toBe(false);
  });

  it("marks the display name and picture personal", () => {
    expect(anonymizeKind(meSchema.shape.displayName)).toBe("personal");
    expect(anonymizeKind(meSchema.shape.avatarUrl)).toBe("personal");
  });

  it("is in the OpenAPI document, with its roles, markers and error codes", async () => {
    const operation = (await createOpenApiDocument()).paths?.["/me"]?.get;

    expect(operation).toMatchObject({
      summary: "The signed-in person",
      "x-roles": ["admin", "member", "guest", "anonymous"],
    });
    expect(Object.keys(operation?.responses ?? {}).sort()).toEqual([
      "200",
      "401",
      "500",
    ]);
    expect(operation?.responses).toMatchObject({
      "200": {
        content: {
          "application/json": {
            schema: {
              properties: {
                displayName: { "x-anonymize": "personal" },
                avatarUrl: { "x-anonymize": "personal" },
              },
            },
          },
        },
      },
      "401": {
        content: {
          "application/json": {
            schema: {
              properties: {
                error: {
                  properties: {
                    code: { enum: ["unauthenticated", "access_ended"] },
                  },
                },
              },
            },
          },
        },
      },
    });
  });
});

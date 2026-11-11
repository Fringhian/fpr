import { describe, expect, it } from "vitest";
import { anonymizeKind } from "../anonymize.js";
import { createOpenApiDocument } from "../openapi.js";
import { routeErrorCodes } from "../route.js";
import { apiRoutes } from "./index.js";
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
  it("is declared for every signed-in role", () => {
    expect(getMe).toMatchObject({
      method: "get",
      path: "/me",
      roles: ["admin", "member", "guest", "anonymous"],
    });
    expect(routeErrorCodes(getMe).sort()).toEqual(
      ["access_ended", "internal_error", "unauthenticated"].sort(),
    );
  });

  it("accepts the signed-in person, and refuses a colour or name out of range", () => {
    expect(meSchema.parse(me)).toEqual(me);
    expect(meSchema.safeParse({ ...me, color: 11 }).success).toBe(false);
    expect(meSchema.safeParse({ ...me, displayName: "" }).success).toBe(false);
    expect(meSchema.safeParse({ ...me, language: "de" }).success).toBe(false);
  });

  it("marks the display name and picture personal", () => {
    expect(anonymizeKind(meSchema.shape.displayName)).toBe("personal");
    expect(anonymizeKind(meSchema.shape.avatarUrl)).toBe("personal");
    expect(anonymizeKind(meSchema.shape.color)).toBeUndefined();
  });

  it("is in the OpenAPI document, with its response and error codes", () => {
    const operation = createOpenApiDocument(apiRoutes).paths["/me"]?.get;

    expect(operation?.summary).toBe("The signed-in person");
    expect(operation?.parameters).toBeUndefined();
    expect(operation?.requestBody).toBeUndefined();
    expect(Object.keys(operation?.responses ?? {})).toEqual([
      "200",
      "401",
      "500",
    ]);
    expect(
      operation?.responses["200"]?.content?.["application/json"].schema,
    ).toMatchObject({
      type: "object",
      properties: {
        displayName: { "x-anonymize": "personal" },
        avatarUrl: { "x-anonymize": "personal" },
        color: { type: "integer", minimum: 1, maximum: 10 },
      },
    });
    expect(operation?.responses["401"]?.description).toBe(
      "`unauthenticated`, `access_ended`",
    );
  });
});

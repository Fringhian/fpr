import { describe, expect, it } from "vitest";
import { anonymizeKind } from "../../anonymize.js";
import { createOpenApiDocument } from "../../openapi.js";
import {
  getMe,
  type Me,
  meSchema,
  meUpdateBodySchema,
  updateMe,
} from "./profile.js";

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
    expect(
      meSchema.safeParse({ ...me, language: "fr", onboarded: true }).success,
    ).toBe(true);
    expect(meSchema.safeParse({ ...me, color: 11 }).success).toBe(false);
    expect(meSchema.safeParse({ ...me, displayName: "" }).success).toBe(false);
    expect(meSchema.safeParse({ ...me, language: "de" }).success).toBe(false);
    expect(meSchema.safeParse({ ...me, role: "owner" }).success).toBe(false);
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

describe("PATCH /me", () => {
  it("is declared for everyone but anonymous viewers, with color_taken", () => {
    const { route, meta, errorMap } = updateMe["~orpc"];
    expect(route).toMatchObject({ method: "PATCH", path: "/me" });
    expect(meta.roles).toEqual(["admin", "member", "guest"]);
    expect(Object.keys(errorMap).sort()).toEqual(
      [
        "access_ended",
        "color_taken",
        "forbidden",
        "internal_error",
        "invalid_request",
        "unauthenticated",
      ].sort(),
    );
  });

  it.each([
    { displayName: "Alex Martin" },
    { displayName: "A" },
    { displayName: "x".repeat(40) },
    { color: 1 },
    { color: 10 },
    { language: "fr" },
    { language: "en" },
    { onboarded: true },
    { displayName: "Sam Leroy", color: 7, language: "en", onboarded: true },
  ])("accepts %j", (body) => {
    expect(meUpdateBodySchema.parse(body)).toEqual(body);
  });

  it.each([
    {},
    { displayName: "" },
    { displayName: "x".repeat(41) },
    { color: 0 },
    { color: 11 },
    { color: 2.5 },
    { color: "3" },
    { language: "de" },
    { language: null },
    { onboarded: false },
    { role: "admin" },
    { avatarUrl: "https://example.com/a.png" },
  ])("refuses %j", (body) => {
    expect(meUpdateBodySchema.safeParse(body).success).toBe(false);
  });

  it("answers the person as GET /me does", () => {
    expect(updateMe["~orpc"].outputSchema).toBe(meSchema);
  });

  it("is in the OpenAPI document, with its limits and its 409", async () => {
    const operation = (await createOpenApiDocument()).paths?.["/me"]?.patch;

    expect(operation).toMatchObject({
      operationId: "me.update",
      tags: ["me"],
      "x-roles": ["admin", "member", "guest"],
      requestBody: {
        content: {
          "application/json": {
            schema: {
              properties: {
                displayName: { minLength: 1, maxLength: 40 },
                color: { minimum: 1, maximum: 10 },
                language: { enum: ["fr", "en"] },
                onboarded: { const: true },
              },
            },
          },
        },
      },
      responses: { "409": { description: "`color_taken`" } },
    });
    expect(Object.keys(operation?.responses ?? {}).sort()).toEqual([
      "200",
      "400",
      "401",
      "403",
      "409",
      "500",
    ]);
  });
});

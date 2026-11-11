import { describe, expect, it } from "vitest";
import { z } from "zod";
import { euro, personal, quantity } from "./anonymize.js";
import { decimalPattern, decimalSchema } from "./decimal.js";
import { createOpenApiDocument, openApiPath } from "./openapi.js";
import { periodSchema } from "./period.js";
import { defineRoute } from "./route.js";

const holding = defineRoute({
  method: "get",
  path: "/users/:userId/holdings/:shareId",
  summary: "One holding",
  roles: ["admin", "member", "guest", "anonymous"],
  params: z.object({ userId: z.uuid(), shareId: z.uuid() }),
  query: z.object({
    period: periodSchema,
    limit: z.coerce.number().int().optional(),
  }),
  responses: {
    200: z.object({
      owner: personal(z.string()),
      value: euro(decimalSchema),
      held: quantity(decimalSchema),
      at: z.iso.datetime(),
    }),
  },
  errors: ["not_found"],
});

const change = defineRoute({
  method: "post",
  path: "/users/:userId/holdings/:shareId",
  summary: "Add or remove shares",
  roles: ["admin", "member"],
  params: z.object({ userId: z.uuid(), shareId: z.uuid() }),
  body: z.object({
    quantityDelta: decimalSchema,
    note: z.string().default(""),
  }),
  responses: { 201: z.object({ id: z.uuid() }), 204: null },
  errors: ["holding_below_zero", "future_moment"],
});

const document = createOpenApiDocument([holding, change]);
const path = document.paths["/users/{userId}/holdings/{shareId}"];

describe("createOpenApiDocument", () => {
  it("is an OpenAPI 3.1 document served under /api", () => {
    expect(document.openapi).toBe("3.1.1");
    expect(document.servers).toEqual([{ url: "/api" }]);
  });

  it("writes Express params the OpenAPI way, and groups methods by path", () => {
    expect(openApiPath("/shares/:id/values/:at")).toBe(
      "/shares/{id}/values/{at}",
    );
    expect(Object.keys(document.paths)).toEqual([
      "/users/{userId}/holdings/{shareId}",
    ]);
    expect(Object.keys(path ?? {})).toEqual(["get", "post"]);
  });

  it("lists path params as required and query params as declared", () => {
    expect(path?.get?.parameters).toEqual([
      {
        name: "userId",
        in: "path",
        required: true,
        schema: expect.objectContaining({ type: "string", format: "uuid" }),
      },
      {
        name: "shareId",
        in: "path",
        required: true,
        schema: expect.objectContaining({ format: "uuid" }),
      },
      {
        name: "period",
        in: "query",
        required: true,
        schema: {
          type: "string",
          enum: ["1D", "1W", "1M", "3M", "YTD", "all"],
        },
      },
      {
        name: "limit",
        in: "query",
        required: false,
        schema: expect.objectContaining({ type: "integer" }),
      },
    ]);
  });

  it("describes the request body as the client sends it", () => {
    const schema = path?.post?.requestBody?.content["application/json"].schema;
    expect(path?.post?.requestBody?.required).toBe(true);
    expect(schema).toMatchObject({
      type: "object",
      properties: {
        quantityDelta: { type: "string", pattern: decimalPattern.source },
        note: { type: "string", default: "" },
      },
      required: ["quantityDelta"],
    });
  });

  it("describes each success response, with or without a body", () => {
    expect(path?.post?.responses["201"]).toEqual({
      description: "Created",
      content: {
        "application/json": {
          schema: expect.objectContaining({ required: ["id"] }),
        },
      },
    });
    expect(path?.post?.responses["204"]).toEqual({
      description: "No content",
    });
  });

  it("marks the fields the anonymizer replaces", () => {
    const schema = path?.get?.responses["200"]?.content?.["application/json"]
      .schema as { properties: Record<string, Record<string, unknown>> };
    expect(schema.properties.owner?.["x-anonymize"]).toBe("personal");
    expect(schema.properties.value?.["x-anonymize"]).toBe("euro");
    expect(schema.properties.held?.["x-anonymize"]).toBe("quantity");
    expect(schema.properties.at).not.toHaveProperty("x-anonymize");
  });

  it("lists the roles each route accepts", () => {
    expect(path?.get?.["x-roles"]).toEqual([
      "admin",
      "member",
      "guest",
      "anonymous",
    ]);
    expect(path?.post?.["x-roles"]).toEqual(["admin", "member"]);
  });

  it("gives one response per error status, with the route's codes only", () => {
    const responses = path?.post?.responses ?? {};
    expect(Object.keys(responses)).toEqual([
      "201",
      "204",
      "400",
      "401",
      "403",
      "422",
      "500",
    ]);
    expect(responses["422"]?.description).toBe(
      "`holding_below_zero`, `future_moment`",
    );
    expect(responses["422"]?.content?.["application/json"].schema).toEqual(
      expect.objectContaining({
        properties: {
          error: expect.objectContaining({
            properties: expect.objectContaining({
              code: {
                type: "string",
                enum: ["holding_below_zero", "future_moment"],
              },
            }),
            required: ["code"],
          }),
        },
      }),
    );
    expect(path?.get?.responses["404"]?.description).toBe("`not_found`");
    expect(path?.get?.responses).not.toHaveProperty("422");
  });

  it("refuses a route declared twice", () => {
    expect(() => createOpenApiDocument([holding, holding])).toThrow(
      "GET /users/:userId/holdings/:shareId is declared twice",
    );
  });
});

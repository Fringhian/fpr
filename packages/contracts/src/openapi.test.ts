import { describe, expect, it } from "vitest";
import { z } from "zod";
import { apiContract } from "./api/index.js";
import { contractProcedures } from "./contract.js";
import { createOpenApiDocument } from "./openapi.js";

const document = await createOpenApiDocument();

const operations = contractProcedures(apiContract).map(([path, procedure]) => {
  const { route, outputSchema, errorMap } = procedure["~orpc"];
  const method = route.method?.toLowerCase() as "get";
  const operation = document.paths?.[route.path ?? ""]?.[method];
  return { key: path.join("."), route, outputSchema, errorMap, operation };
});

const withoutBody = operations.filter(
  ({ outputSchema }) => outputSchema instanceof z.ZodVoid,
);

describe("a success response without a body", () => {
  it("exists, among 201 and 204 routes", () => {
    const statuses = withoutBody.map(({ route }) => route.successStatus);
    expect(statuses).toContain(201);
    expect(statuses).toContain(204);
  });

  it.each(withoutBody)("has no content in $key", ({ route, operation }) => {
    const success = operation?.responses?.[route.successStatus ?? 200];
    expect(success).toEqual({ description: "OK" });
  });
});

describe("an error response", () => {
  const typed = operations.flatMap(({ key, errorMap, operation }) =>
    Object.entries(
      errorMap as Record<string, { status?: number; data?: unknown }>,
    ).flatMap(([code, definition]) =>
      definition.data instanceof z.ZodObject
        ? [{ key, code, definition, operation }]
        : [],
    ),
  );

  it("declares typed details for the codes that carry them", () => {
    expect(new Set(typed.map(({ code }) => code))).toEqual(
      new Set([
        "holding_below_zero",
        "invalid_access_key",
        "isin_taken",
        "value_changed",
      ]),
    );
  });

  it.each(typed)(
    "shows the details of $code in $key",
    ({ code, definition, operation }) => {
      const body = JSON.stringify(
        operation?.responses?.[String(definition.status)],
      );
      expect(body).toContain(`"code":{"const":"${code}"}`);
      expect(body).toContain('"required":["code","details"]');
      const fields = Object.keys((definition.data as z.ZodObject).shape).map(
        (field) => `"${field}":`,
      );
      for (const field of fields) {
        expect(body).toContain(field);
      }
    },
  );

  it("names each code once, with optional untyped details", async () => {
    const forbidden = JSON.stringify(
      document.paths?.["/me"]?.patch?.responses?.["403"],
    );
    expect(forbidden).toContain('"code":{"const":"forbidden"}');
    expect(forbidden).toContain('"required":["code"]');
  });
});

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

/** A part of the document as JSON, each `$ref` to a component replaced by it. */
function withRefsResolved(json: string): string {
  return json.replace(
    /\{"\$ref":"#\/components\/schemas\/(\w+)"\}/g,
    (_, name: string) =>
      JSON.stringify(document.components?.schemas?.[name] ?? {}),
  );
}

describe("the OpenAPI document", () => {
  it("holds the API's routes and none of the price service's", () => {
    const operationIds = Object.values(document.paths ?? {})
      .flatMap((item) => Object.values(item ?? {}))
      .flatMap((operation) =>
        typeof operation === "object" &&
        operation !== null &&
        "operationId" in operation
          ? [operation.operationId]
          : [],
      );
    expect(operationIds.sort()).toEqual(
      operations.map(({ key }) => key).sort(),
    );
  });

  it("holds the details of invalid_request once, as a shared component", () => {
    expect(Object.keys(document.components?.schemas ?? {})).toEqual([
      "InvalidRequestDetails",
    ]);
    expect(JSON.stringify(document).match(/"issues":/g)).toHaveLength(1);
  });
});

describe("a success response without a body", () => {
  const withoutBody = operations.filter(
    ({ outputSchema }) => outputSchema instanceof z.ZodVoid,
  );

  it("exists", () => {
    expect(withoutBody.length).toBeGreaterThan(0);
  });

  it.each(withoutBody)("has no content: $key", ({ route, operation }) => {
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

  it("exists with typed details", () => {
    expect(typed.length).toBeGreaterThan(0);
  });

  it.each(typed)(
    "shows the typed details of $code: $key",
    ({ code, definition, operation }) => {
      const body = withRefsResolved(
        JSON.stringify(operation?.responses?.[String(definition.status)]),
      );
      expect(body).toContain(`"code":{"const":"${code}"}`);
      expect(body).toContain('"required":["code","details"]');
      for (const field of Object.keys((definition.data as z.ZodObject).shape)) {
        expect(body).toContain(`"${field}":`);
      }
    },
  );

  it("names a code without typed details, with its details optional", () => {
    const forbidden = JSON.stringify(
      document.paths?.["/me"]?.patch?.responses?.["403"],
    );
    expect(forbidden).toContain('"code":{"const":"forbidden"}');
    expect(forbidden).toContain('"required":["code"]');
  });
});

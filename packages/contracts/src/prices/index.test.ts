import { describe, expect, it } from "vitest";
import { apiContract } from "../api/index.js";
import { contractProcedures, missingPathParams } from "../contract.js";
import { createOpenApiDocument } from "../openapi.js";
import { pricesContract } from "./index.js";

const procedures = contractProcedures(pricesContract).map(
  ([path, procedure]) => [path.join("."), procedure] as const,
);

describe.each(procedures)("%s", (_, procedure) => {
  const { route, inputSchema, errorMap } = procedure["~orpc"];

  it("declares its method, path and summary", () => {
    expect(route.method).toBeDefined();
    expect(route.path).toMatch(/^\//);
    expect(route.summary).toBeTruthy();
  });

  it("declares internal_error and unauthenticated, for a wrong token", () => {
    expect(errorMap).toHaveProperty("internal_error");
    expect(errorMap).toHaveProperty("unauthenticated");
  });

  it("declares invalid_request when it has an input", () => {
    expect("invalid_request" in errorMap).toBe(inputSchema !== undefined);
  });

  it("takes each parameter of its path as a required input field", () => {
    expect(missingPathParams(procedure)).toEqual([]);
  });

  it("declares none of the API's session or role codes", () => {
    for (const code of ["access_ended", "forbidden"]) {
      expect(errorMap).not.toHaveProperty(code);
    }
  });
});

describe("pricesContract", () => {
  it("declares each method and path once", () => {
    const routes = procedures.map(([, procedure]) => {
      const { method, path } = procedure["~orpc"].route;
      return `${method} ${path}`;
    });
    expect(new Set(routes).size).toBe(routes.length);
  });

  it("is left out of the OpenAPI document", async () => {
    const document = await createOpenApiDocument();
    const operations = Object.values(document.paths ?? {}).flatMap((item) =>
      Object.values(item ?? {}),
    );
    const operationIds = operations.flatMap((operation) =>
      typeof operation === "object" &&
      operation !== null &&
      "operationId" in operation
        ? [operation.operationId]
        : [],
    );
    const apiIds = contractProcedures(apiContract).map(([path]) =>
      path.join("."),
    );

    expect(operationIds.sort()).toEqual(apiIds.sort());
    expect(document.paths).not.toHaveProperty("/lookup");
    expect(document.paths).not.toHaveProperty("/refresh");
    for (const [key] of procedures) {
      expect(operationIds).not.toContain(key);
    }
  });
});

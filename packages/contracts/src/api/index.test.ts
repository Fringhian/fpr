import { describe, expect, it } from "vitest";
import {
  contractProcedures,
  missingErrorCodes,
  missingPathParams,
} from "../contract.js";
import { apiContract } from "./index.js";

const procedures = contractProcedures(apiContract).map(
  ([path, procedure]) => [path.join("."), procedure] as const,
);

describe.each(procedures)("%s", (_, procedure) => {
  const { route } = procedure["~orpc"];

  it("declares its method, path and summary", () => {
    expect(route.method).toBeDefined();
    expect(route.path).toMatch(/^\//);
    expect(route.summary).toBeTruthy();
  });

  it("declares every error code its kind requires", () => {
    expect(missingErrorCodes(procedure)).toEqual([]);
  });

  it("takes each parameter of its path as a required input field", () => {
    expect(missingPathParams(procedure)).toEqual([]);
  });
});

describe("apiContract", () => {
  it("declares each method and path once", () => {
    const routes = procedures.map(([, procedure]) => {
      const { method, path } = procedure["~orpc"].route;
      return `${method} ${path}`;
    });
    expect(new Set(routes).size).toBe(routes.length);
  });
});

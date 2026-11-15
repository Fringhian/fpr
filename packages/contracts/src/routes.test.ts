import { describe, expect, it } from "vitest";
import { apiContract } from "./api/index.js";
import {
  type ContractTree,
  contractProcedures,
  missingErrorCodes,
  missingPathParams,
} from "./contract.js";
import { pricesContract } from "./prices/index.js";

/** Every route of a contract, named by its place in the tree. */
function routesOf(contract: ContractTree) {
  return contractProcedures(contract).map(([path, procedure]) => ({
    key: path.join("."),
    procedure,
  }));
}

const api = routesOf(apiContract);
const prices = routesOf(pricesContract);

describe.each([
  ["apiContract", api],
  ["pricesContract", prices],
])("%s", (_, routes) => {
  it("declares each method and path once", () => {
    const endpoints = routes.map(({ procedure }) => {
      const { method, path } = procedure["~orpc"].route;
      return `${method} ${path}`;
    });
    expect(new Set(endpoints).size).toBe(endpoints.length);
  });

  it.each(routes)(
    "declares its method, path, and summary, and requires its path parameters: $key",
    ({ procedure }) => {
      const { method, path, summary } = procedure["~orpc"].route;
      expect(method).toBeDefined();
      expect(path).toMatch(/^\//);
      expect(summary).toBeTruthy();
      expect(missingPathParams(procedure)).toEqual([]);
    },
  );
});

describe("an API route", () => {
  it.each(api)(
    "declares every code its kind requires: $key",
    ({ procedure }) => {
      expect(missingErrorCodes(procedure)).toEqual([]);
    },
  );
});

describe("a price service route", () => {
  it.each(prices)(
    "declares the token and input codes, and no session or role code: $key",
    ({ procedure }) => {
      const { errorMap, inputSchema } = procedure["~orpc"];
      expect(errorMap).toHaveProperty("internal_error");
      expect(errorMap).toHaveProperty("unauthenticated");
      expect("invalid_request" in errorMap).toBe(inputSchema !== undefined);
      expect(errorMap).not.toHaveProperty("access_ended");
      expect(errorMap).not.toHaveProperty("forbidden");
    },
  );
});

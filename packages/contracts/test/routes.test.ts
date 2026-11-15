import { oc } from "@orpc/contract";
import { describe, expect, it } from "vitest";
import { apiContract } from "../src/api/index.js";
import {
  type ContractTree,
  contractProcedures,
  missingErrorCodes,
  missingPathParams,
  type RouteMeta,
  type RouteTree,
  routeMetaSchema,
} from "../src/contract.js";
import { pricesContract } from "../src/prices/index.js";
import { Role } from "../src/roles.js";

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

describe("the API's access declarations", () => {
  it.each(api)("declare who may call the route: $key", ({ procedure }) => {
    expect(routeMetaSchema.safeParse(procedure["~orpc"].meta).success).toBe(
      true,
    );
  });

  it("make these routes public, and no other", () => {
    const publicRoutes = api.flatMap(({ key, procedure }) =>
      (procedure["~orpc"].meta as RouteMeta).roles === "public" ? [key] : [],
    );

    expect(publicRoutes).toEqual([
      "access.setupStatus",
      "access.setup",
      "access.check",
      "access.claim",
      "access.signIn",
      "access.checkReset",
      "access.reset",
    ]);
  });

  it("are required by the types: a route from oc alone fails to type-check", () => {
    const undeclared = {
      route: oc.route({ method: "GET", path: "/undeclared" }),
    };

    // @ts-expect-error A route built from `oc` alone declares no access.
    undeclared satisfies RouteTree;
    expect(routeMetaSchema.safeParse(undeclared.route["~orpc"].meta)).toEqual(
      expect.objectContaining({ success: false }),
    );
  });
});

describe("the API's writes", () => {
  const writes = api.flatMap(({ key, procedure }) => {
    const { route, meta } = procedure["~orpc"];
    const { roles } = meta as RouteMeta;
    return route.method === "GET" || roles === "public"
      ? []
      : [{ key, path: route.path ?? "", roles }];
  });

  it("accept anonymous viewers on none", () => {
    expect(
      writes.filter(({ roles }) => roles.includes(Role.anonymous)),
    ).toEqual([]);
  });

  it("accept guests on their own profile alone, under /me", () => {
    expect(
      writes.filter(
        ({ path, roles }) =>
          roles.includes(Role.guest) && !/^\/me(\/|$)/.test(path),
      ),
    ).toEqual([]);
  });
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

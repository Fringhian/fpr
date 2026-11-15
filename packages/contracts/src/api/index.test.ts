import { describe, expect, it } from "vitest";
import {
  contractProcedures,
  missingErrorCodes,
  missingPathParams,
  type RouteMeta,
} from "../contract.js";
import { Role } from "../roles.js";
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
  const writes = procedures.flatMap(([key, procedure]) => {
    const { route, meta } = procedure["~orpc"];
    const { roles } = meta as RouteMeta;
    return route.method === "GET" || roles === "public"
      ? []
      : [{ key, path: route.path ?? "", roles }];
  });

  it("accepts anonymous viewers on no write", () => {
    expect(
      writes.filter(({ roles }) => roles.includes(Role.anonymous)),
    ).toEqual([]);
  });

  it("accepts guests on writes to their own profile alone, under /me", () => {
    expect(
      writes.filter(
        ({ path, roles }) =>
          roles.includes(Role.guest) && !/^\/me(\/|$)/.test(path),
      ),
    ).toEqual([]);
  });

  it("declares each method and path once", () => {
    const routes = procedures.map(([, procedure]) => {
      const { method, path } = procedure["~orpc"].route;
      return `${method} ${path}`;
    });
    expect(new Set(routes).size).toBe(routes.length);
  });
});

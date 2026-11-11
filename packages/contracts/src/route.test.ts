import { describe, expect, expectTypeOf, it } from "vitest";
import { z } from "zod";
import {
  defineRoute,
  type PathParamNames,
  pathParamNames,
  type RouteContract,
  routeErrorCodes,
} from "./route.js";

const ok = { 200: z.object({ ok: z.boolean() }) };

describe("PathParamNames", () => {
  it("names every :param of a path", () => {
    expectTypeOf<PathParamNames<"/me">>().toEqualTypeOf<never>();
    expectTypeOf<PathParamNames<"/users/:userId">>().toEqualTypeOf<"userId">();
    expectTypeOf<PathParamNames<"/shares/:id/values/:at">>().toEqualTypeOf<
      "id" | "at"
    >();
  });

  it("matches pathParamNames at runtime", () => {
    expect(pathParamNames("/me")).toEqual([]);
    expect(pathParamNames("/shares/:id/values/:at")).toEqual(["id", "at"]);
  });
});

describe("defineRoute", () => {
  it("returns the route as declared", () => {
    const route = defineRoute({
      method: "get",
      path: "/users/:userId/log",
      summary: "A member's log",
      roles: ["admin", "member"],
      params: z.object({ userId: z.uuid() }),
      query: z.object({ limit: z.coerce.number().int().optional() }),
      responses: ok,
      errors: ["not_found"],
    });

    expect(route.path).toBe("/users/:userId/log");
    expectTypeOf(route.method).toEqualTypeOf<"get">();
    expectTypeOf(route).toExtend<RouteContract>();
  });

  it("requires a schema for each path param", () => {
    expect(() =>
      // @ts-expect-error: the path has :userId, and params is missing.
      defineRoute({
        method: "get",
        path: "/users/:userId",
        summary: "x",
        roles: "public",
        responses: ok,
      }),
    ).toThrow("params declares [], the path has [userId]");
  });

  it("refuses a params schema with a key the path doesn't have", () => {
    expect(() =>
      defineRoute({
        method: "get",
        path: "/users/:userId",
        summary: "x",
        roles: "public",
        params: z.object({ userId: z.string(), id: z.string() }),
        responses: ok,
      }),
    ).toThrow("params declares [id, userId], the path has [userId]");
  });

  it("refuses params on a path without any", () => {
    expect(() =>
      defineRoute({
        method: "get",
        path: "/me",
        summary: "x",
        roles: "public",
        // @ts-expect-error: /me has no :params.
        params: z.object({ id: z.string() }),
        responses: ok,
      }),
    ).toThrow("params declares [id], the path has []");
  });

  it("refuses a path param schema that doesn't take a string", () => {
    defineRoute({
      method: "get",
      path: "/shares/:id",
      summary: "x",
      roles: "public",
      // @ts-expect-error: a path param arrives as a string.
      params: z.object({ id: z.number() }),
      responses: ok,
    });
  });

  it("refuses a GET with a body", () => {
    expect(() =>
      defineRoute({
        method: "get",
        path: "/me",
        summary: "x",
        roles: "public",
        body: z.object({}),
        responses: ok,
      }),
    ).toThrow("GET /me: a GET route has no body");
  });

  it("refuses a route without a response", () => {
    expect(() =>
      defineRoute({
        method: "delete",
        path: "/me/avatar",
        summary: "x",
        roles: ["member"],
        responses: {},
      }),
    ).toThrow("at least one response");
  });

  it("refuses a path without a leading slash", () => {
    expect(() =>
      defineRoute({
        method: "get",
        path: "me",
        summary: "x",
        roles: "public",
        responses: ok,
      }),
    ).toThrow("starts with a slash");
  });

  it("refuses an unknown role or error code", () => {
    defineRoute({
      method: "get",
      path: "/me",
      summary: "x",
      // @ts-expect-error: there is no such role.
      roles: ["owner"],
      responses: ok,
    });
    defineRoute({
      method: "get",
      path: "/me",
      summary: "x",
      roles: "public",
      responses: ok,
      // @ts-expect-error: there is no such code.
      errors: ["teapot"],
    });
  });
});

describe("routeErrorCodes", () => {
  it("gives a public read only internal_error", () => {
    const route = defineRoute({
      method: "get",
      path: "/status",
      summary: "x",
      roles: "public",
      responses: ok,
    });
    expect(routeErrorCodes(route)).toEqual(["internal_error"]);
  });

  it("gives a public write with a body the origin check and validation", () => {
    const route = defineRoute({
      method: "post",
      path: "/access/check",
      summary: "x",
      roles: "public",
      body: z.object({ key: z.string() }),
      responses: ok,
    });
    expect(routeErrorCodes(route).sort()).toEqual(
      ["forbidden", "internal_error", "invalid_request"].sort(),
    );
  });

  it("gives a signed-in read for every role the session codes", () => {
    const route = defineRoute({
      method: "get",
      path: "/me",
      summary: "x",
      roles: ["admin", "member", "guest", "anonymous"],
      responses: ok,
    });
    expect(routeErrorCodes(route).sort()).toEqual(
      ["access_ended", "internal_error", "unauthenticated"].sort(),
    );
  });

  it("adds forbidden to a read that refuses a role, and keeps the route's own codes", () => {
    const route = defineRoute({
      method: "get",
      path: "/admin/people/:id",
      summary: "x",
      roles: ["admin"],
      params: z.object({ id: z.uuid() }),
      responses: ok,
      errors: ["not_found"],
    });
    expect(routeErrorCodes(route).sort()).toEqual(
      [
        "access_ended",
        "forbidden",
        "internal_error",
        "invalid_request",
        "not_found",
        "unauthenticated",
      ].sort(),
    );
  });
});

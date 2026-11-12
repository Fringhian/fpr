import { describe, expect, it } from "vitest";
import { z } from "zod";
import {
  errorMap,
  missingErrorCodes,
  missingPathParams,
  publicRoute,
  requiredErrorCodes,
  signedInRoute,
} from "./contract.js";

const ok = z.object({ ok: z.boolean() });

describe("signedInRoute", () => {
  it("carries its roles and the session codes", () => {
    const route = signedInRoute(["admin"]).route({
      method: "GET",
      path: "/x",
    });
    expect(route["~orpc"].meta).toEqual({ roles: ["admin"] });
    expect(Object.keys(route["~orpc"].errorMap).sort()).toEqual(
      ["access_ended", "internal_error", "unauthenticated"].sort(),
    );
  });

  it("can't be used without roles", () => {
    // @ts-expect-error: a signed-in route names the roles it accepts.
    signedInRoute([]);
  });
});

describe("errorMap", () => {
  it("gives each code its status", () => {
    expect(errorMap("not_found", "future_moment")).toMatchObject({
      not_found: { status: 404 },
      future_moment: { status: 422 },
    });
  });
});

describe("requiredErrorCodes", () => {
  it("gives a public read only internal_error", () => {
    const route = publicRoute
      .route({ method: "GET", path: "/status" })
      .output(ok);
    expect(requiredErrorCodes(route)).toEqual(["internal_error"]);
  });

  it("gives a public write with an input the origin check and validation", () => {
    const route = publicRoute
      .route({ method: "POST", path: "/access/check" })
      .input(z.object({ key: z.string() }))
      .output(ok);
    expect(requiredErrorCodes(route).sort()).toEqual(
      ["forbidden", "internal_error", "invalid_request"].sort(),
    );
  });

  it("gives a signed-in read for every role the session codes", () => {
    const route = signedInRoute(["admin", "member", "guest", "anonymous"])
      .route({ method: "GET", path: "/me" })
      .output(ok);
    expect(requiredErrorCodes(route).sort()).toEqual(
      ["access_ended", "internal_error", "unauthenticated"].sort(),
    );
  });

  it("adds forbidden to a read that refuses a role", () => {
    const route = signedInRoute(["admin"])
      .route({ method: "GET", path: "/admin/people" })
      .output(ok);
    expect(requiredErrorCodes(route)).toContain("forbidden");
  });
});

describe("missingPathParams", () => {
  const path = "/users/{userId}/changes/{id}";

  it("lists the path parameters the input doesn't require", () => {
    const route = signedInRoute(["admin"])
      .route({ method: "GET", path })
      .input(z.object({ userId: z.uuid().optional() }));
    expect(missingPathParams(route)).toEqual(["userId", "id"]);
    const withoutInput = publicRoute.route({ method: "GET", path });
    expect(missingPathParams(withoutInput)).toEqual(["userId", "id"]);
  });

  it("is empty once the input requires each of them", () => {
    const route = signedInRoute(["admin"])
      .route({ method: "GET", path })
      .input(z.object({ userId: z.uuid(), id: z.uuid(), limit: z.int() }));
    expect(missingPathParams(route)).toEqual([]);
  });
});

describe("missingErrorCodes", () => {
  const route = signedInRoute(["admin", "member"])
    .route({ method: "POST", path: "/users/{userId}/cash-balances" })
    .input(z.object({ userId: z.uuid(), amountEur: z.string() }))
    .output(ok);

  it("lists the required codes a route doesn't declare", () => {
    expect(missingErrorCodes(route).sort()).toEqual(
      ["forbidden", "invalid_request"].sort(),
    );
  });

  it("is empty once they are declared", () => {
    const declared = route.errors(errorMap("forbidden", "invalid_request"));
    expect(missingErrorCodes(declared)).toEqual([]);
  });
});

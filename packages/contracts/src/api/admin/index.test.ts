import { describe, expect, it } from "vitest";
import type { ErrorCode } from "../../errors.js";
import { createOpenApiDocument } from "../../openapi.js";
import type { Role } from "../../roles.js";
import { adminContract } from "./index.js";

const document = await createOpenApiDocument();

const session: ErrorCode[] = [
  "internal_error",
  "unauthenticated",
  "access_ended",
  "forbidden",
];
const write: ErrorCode[] = [...session, "invalid_request"];

const routes: [
  key: keyof typeof adminContract,
  method: string,
  path: string,
  roles: Role[],
  codes: ErrorCode[],
][] = [
  ["people", "GET", "/admin/people", ["admin", "anonymous"], session],
  ["addPerson", "POST", "/admin/people", ["admin"], [...write, "email_taken"]],
  [
    "updatePerson",
    "PATCH",
    "/admin/people/{id}",
    ["admin"],
    [
      ...write,
      "not_found",
      "email_taken",
      "last_admin",
      "has_portfolio_entries",
      "anonymous_role_fixed",
    ],
  ],
  [
    "revoke",
    "POST",
    "/admin/people/{id}/revoke",
    ["admin"],
    [...write, "not_found", "last_admin"],
  ],
  [
    "restore",
    "POST",
    "/admin/people/{id}/restore",
    ["admin"],
    [...write, "not_found"],
  ],
  [
    "replaceLink",
    "POST",
    "/admin/people/{id}/replace-link",
    ["admin"],
    [...write, "not_found", "last_admin"],
  ],
  [
    "resetKey",
    "POST",
    "/admin/people/{id}/reset-key",
    ["admin"],
    [...write, "not_found"],
  ],
  [
    "deletePerson",
    "DELETE",
    "/admin/people/{id}",
    ["admin"],
    [...write, "not_found", "last_admin"],
  ],
  ["shares", "GET", "/admin/shares", ["admin", "anonymous"], session],
  [
    "makeManual",
    "POST",
    "/admin/shares/{id}/make-manual",
    ["admin"],
    [...write, "not_found", "share_not_needing_attention", "future_moment"],
  ],
  [
    "refreshPrices",
    "POST",
    "/admin/prices/refresh",
    ["admin"],
    [...session, "refresh_running", "call_budget_used"],
  ],
];

describe("adminContract", () => {
  it("declares every admin route", () => {
    expect(Object.keys(adminContract).sort()).toEqual(
      routes.map(([key]) => key).sort(),
    );
  });
});

describe.each(routes)("admin.%s", (key, method, path, roles, codes) => {
  const { route, meta, errorMap } = adminContract[key]["~orpc"];

  it(`is ${method} ${path} for ${roles.join(" and ")}`, () => {
    expect(route).toMatchObject({ method, path });
    expect(meta.roles).toEqual(roles);
  });

  it("declares exactly its error codes", () => {
    expect(Object.keys(errorMap).sort()).toEqual([...codes].sort());
  });

  it("is in the OpenAPI document with its roles and area", async () => {
    const operation =
      document.paths?.[path]?.[method.toLowerCase() as "get" | "post"];
    expect(operation).toMatchObject({
      operationId: `admin.${key}`,
      tags: ["admin"],
      "x-roles": roles,
    });
  });
});

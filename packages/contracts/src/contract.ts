import { type AnyContractProcedure, oc } from "@orpc/contract";
import { z } from "zod";
import { type ErrorCode, errorStatus } from "./errors.js";
import { roles as everyRole, type Role } from "./roles.js";

/** Who may call a route: anyone, or the signed-in roles it accepts. */
export type Access = "public" | readonly [Role, ...Role[]];

/** What each route declares beyond oRPC's own fields. */
export interface RouteMeta {
  roles: Access;
}

const detailsSchema = z.record(z.string(), z.unknown());

type ErrorMap<Codes extends ErrorCode> = {
  [Code in Codes]: {
    status: (typeof errorStatus)[Code];
    data: z.ZodOptional<typeof detailsSchema>;
  };
};

/** oRPC error definitions for FPR's codes, each with its status. */
export function errorMap<const Codes extends readonly ErrorCode[]>(
  ...codes: Codes
): ErrorMap<Codes[number]> {
  return Object.fromEntries(
    codes.map((code) => [
      code,
      { status: errorStatus[code], data: detailsSchema.optional() },
    ]),
  ) as ErrorMap<Codes[number]>;
}

/** The base of a route anyone may call. */
export const publicRoute = oc
  .$meta<RouteMeta>({ roles: "public" })
  .errors(errorMap("internal_error"));

/** The base of a route for signed-in people with one of these roles. */
export function signedInRoute(roles: readonly [Role, ...Role[]]) {
  return publicRoute
    .meta({ roles })
    .errors(errorMap("unauthenticated", "access_ended"));
}

/**
 * The codes the request pipeline can answer a route with, from its kind:
 * - `internal_error` for every route;
 * - `invalid_request` for a route with an input;
 * - `unauthenticated` and `access_ended` for a signed-in route;
 * - `forbidden` for a write, refused when its `Origin` isn't `PUBLIC_URL`, and
 *   for a route that refuses a role.
 */
export function requiredErrorCodes(
  procedure: AnyContractProcedure,
): ErrorCode[] {
  const { route, meta, inputSchema } = procedure["~orpc"];
  const { roles } = meta as RouteMeta;
  const codes: ErrorCode[] = ["internal_error"];

  if (inputSchema !== undefined) {
    codes.push("invalid_request");
  }
  if (roles !== "public") {
    codes.push("unauthenticated", "access_ended");
  }
  const refusesARole =
    roles !== "public" && !everyRole.every((role) => roles.includes(role));
  if (route.method !== "GET" || refusesARole) {
    codes.push("forbidden");
  }

  return codes;
}

/** The required codes a route doesn't declare with `.errors(...)`. */
export function missingErrorCodes(
  procedure: AnyContractProcedure,
): ErrorCode[] {
  const declared = procedure["~orpc"].errorMap;
  return requiredErrorCodes(procedure).filter((code) => !(code in declared));
}

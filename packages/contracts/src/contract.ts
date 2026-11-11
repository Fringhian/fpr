import {
  type AnyContractProcedure,
  isContractProcedure,
  oc,
} from "@orpc/contract";
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

type ErrorWithDetails<Code extends ErrorCode, Details extends z.ZodType> = {
  [Key in Code]: { status: (typeof errorStatus)[Key]; data: Details };
};

/**
 * The oRPC error definition of a code whose `details` always follow a schema,
 * such as `errorWithDetails("isin_taken", isinTakenDetailsSchema)`. The
 * OpenAPI document shows them under the code.
 */
export function errorWithDetails<
  const Code extends ErrorCode,
  Details extends z.ZodType,
>(code: Code, details: Details): ErrorWithDetails<Code, Details> {
  return {
    [code]: { status: errorStatus[code], data: details },
  } as ErrorWithDetails<Code, Details>;
}

/** Contracts grouped by key, such as `{ me: { get: getMe } }`. */
export interface ContractTree {
  readonly [key: string]: AnyContractProcedure | ContractTree;
}

/** Every contract of a tree, with its keys, such as `["me", "get"]`. */
export function contractProcedures(
  tree: ContractTree,
  path: readonly string[] = [],
): [path: string[], procedure: AnyContractProcedure][] {
  return Object.entries(tree).flatMap(([key, item]) =>
    isContractProcedure(item)
      ? [[[...path, key], item] as [string[], AnyContractProcedure]]
      : contractProcedures(item, [...path, key]),
  );
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

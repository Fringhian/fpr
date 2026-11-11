import { oc } from "@orpc/contract";
import { z } from "zod";
import { type ErrorCode, errorStatus } from "./errors.js";
import type { Role } from "./roles.js";

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

/** The base of a public route. */
export const publicRoute = oc
  .$meta<RouteMeta>({ roles: "public" })
  .errors(errorMap("internal_error"));

/** The base of a signed-in route. Set its roles with `.meta({ roles })`. */
export const signedInRoute = publicRoute.errors(
  errorMap("unauthenticated", "access_ended"),
);

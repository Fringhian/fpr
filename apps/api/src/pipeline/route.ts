import { type Access, routeMetaSchema } from "@fpr/contracts";
import type { AnyProcedure } from "@orpc/server";
import { apiError } from "../errors.js";

/**
 * Who may call the route, as its contract declares with `publicRoute` or
 * `signedInRoute(roles)`. A route that declares nothing is refused with
 * `forbidden`.
 */
export function routeAccess(procedure: AnyProcedure): Access {
  const meta = routeMetaSchema.safeParse(procedure["~orpc"].meta);
  if (!meta.success) {
    throw apiError("forbidden");
  }
  return meta.data.roles;
}

const readMethods: ReadonlySet<string> = new Set(["GET", "HEAD"]);

/** Whether the route writes: any method but `GET` and `HEAD`. */
export function isWrite(procedure: AnyProcedure): boolean {
  return !readMethods.has(procedure["~orpc"].route.method ?? "POST");
}

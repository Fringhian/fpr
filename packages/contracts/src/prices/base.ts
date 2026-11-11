import { oc } from "@orpc/contract";
import { errorMap } from "../contract.js";

/**
 * The base of a price service route. Only the API calls these routes, with
 * `Authorization: Bearer <PRICES_TOKEN>`: a wrong or missing token answers
 * `unauthenticated`.
 */
export const internalRoute = oc.errors(
  errorMap("internal_error", "unauthenticated"),
);

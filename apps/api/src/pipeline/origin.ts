import { os } from "@orpc/server";
import { apiError } from "../errors.js";
import type { ApiContext } from "../orpc.js";
import { isWrite } from "./route.js";

/**
 * The origin check: a write whose `Origin` isn't `PUBLIC_URL`'s origin, or
 * that has none, is refused with `forbidden`, public routes included.
 */
export const checkOrigin = os
  .$context<ApiContext>()
  .middleware(({ context, next, procedure }) => {
    if (
      isWrite(procedure) &&
      context.req.get("origin") !== context.publicOrigin
    ) {
      throw apiError("forbidden");
    }
    return next();
  });

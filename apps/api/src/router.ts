import { apiContract } from "@fpr/contracts";
import { implement } from "@orpc/server";
import type { ApiContext } from "./orpc.js";

const api = implement(apiContract).$context<ApiContext>();

/**
 * The handlers of the routes in `apiContract`, with the same keys. A route
 * without a handler yet is not served, and answers `not_found`.
 */
export const apiRouter = {
  me: {
    // Sessions arrive with the request pipeline (#71). Until then nobody is
    // signed in.
    get: api.me.get.handler(({ errors }) => {
      throw errors.unauthenticated();
    }),
  },
};

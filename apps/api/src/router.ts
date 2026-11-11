import { apiContract } from "@fpr/contracts";
import { implement } from "@orpc/server";
import type { ApiContext } from "./orpc.js";

const api = implement(apiContract).$context<ApiContext>();

/** The handler of every route in `apiContract`. */
export const apiRouter = api.router({
  // Sessions arrive with the request pipeline (#71). Until then nobody is
  // signed in.
  getMe: api.getMe.handler(({ errors }) => {
    throw errors.unauthenticated();
  }),
});

import { meRouter } from "./me/index.js";

export { api } from "./implement.js";

/**
 * The handlers of the routes in `apiContract`, with the same keys. A route
 * without a handler yet is not served, and answers `not_found`.
 */
export const apiRouter = {
  me: meRouter,
};

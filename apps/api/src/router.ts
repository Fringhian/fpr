import { meRouter } from "./me/index.js";

/**
 * The handlers of the routes in `apiContract`, with the same keys. A route
 * without a handler is not served, and answers `not_found`.
 */
export const apiRouter = {
  me: meRouter,
};

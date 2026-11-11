import type { RouteContract } from "../route.js";
import { getMe } from "./me.js";

/** Every route of the API, in the order the OpenAPI document lists them. */
export const apiRoutes = [getMe] as const satisfies readonly RouteContract[];

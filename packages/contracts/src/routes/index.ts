import { getMe } from "./me.js";

/** Every route of the API, in the order the OpenAPI document lists them. */
export const apiContract = { getMe };

export type ApiContract = typeof apiContract;

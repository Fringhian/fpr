import { accessContract } from "./access/index.js";
import { adminContract } from "./admin/index.js";
import { meContract } from "./me/index.js";
import { portfolioContract } from "./portfolio/index.js";
import { raceContract } from "./race/index.js";
import { sharesContract } from "./shares/index.js";

/**
 * Every route of the API, one key per area. The OpenAPI document groups the
 * routes by these keys, in this order.
 */
export const apiContract = {
  access: accessContract,
  me: meContract,
  portfolio: portfolioContract,
  shares: sharesContract,
  race: raceContract,
  admin: adminContract,
};

export type ApiContract = typeof apiContract;

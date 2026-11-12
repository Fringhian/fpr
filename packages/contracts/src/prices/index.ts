import {
  pricesAddManualPrice,
  pricesDeleteManualPrice,
  pricesUpdateManualPrice,
} from "./manual-prices.js";
import { pricesRefresh } from "./refresh.js";
import {
  pricesCreateManual,
  pricesCreateMarket,
  pricesDeleteShare,
  pricesFillHistory,
  pricesLookup,
  pricesMakeManual,
  pricesUpdateShare,
} from "./shares.js";

export type * from "./manual-prices.js";
export type * from "./schemas.js";
export type * from "./shares.js";

/**
 * The price service's internal routes, which only the API calls, with
 * `Authorization: Bearer <PRICES_TOKEN>`. They are left out of the OpenAPI
 * document. This is the `@fpr/contracts/prices` entry point.
 */
export const pricesContract = {
  lookup: pricesLookup,
  createMarket: pricesCreateMarket,
  createManual: pricesCreateManual,
  updateShare: pricesUpdateShare,
  fillHistory: pricesFillHistory,
  addManualPrice: pricesAddManualPrice,
  updateManualPrice: pricesUpdateManualPrice,
  deleteManualPrice: pricesDeleteManualPrice,
  deleteShare: pricesDeleteShare,
  makeManual: pricesMakeManual,
  refresh: pricesRefresh,
};

export type PricesContract = typeof pricesContract;

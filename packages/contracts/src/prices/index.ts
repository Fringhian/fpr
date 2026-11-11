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

export {
  type PricesAddManualPriceInput,
  type PricesDeleteManualPriceInput,
  type PricesUpdateManualPriceInput,
  pricesAddManualPrice,
  pricesAddManualPriceInputSchema,
  pricesDeleteManualPrice,
  pricesDeleteManualPriceInputSchema,
  pricesUpdateManualPrice,
  pricesUpdateManualPriceInputSchema,
} from "./manual-prices.js";
export { pricesRefresh } from "./refresh.js";
export {
  type PricesHistory,
  type PricesListing,
  type PricesLookupResult,
  type PricesValuePoint,
  pricesCurrencySchema,
  pricesHistorySchema,
  pricesListingSchema,
  pricesLookupResultSchema,
  pricesPriceEurSchema,
  pricesShareNameSchema,
  pricesSymbolSchema,
  pricesValuePointSchema,
} from "./schemas.js";
export {
  type PricesCreateManualBody,
  type PricesCreateMarketBody,
  type PricesDeleteShareInput,
  type PricesFillHistoryInput,
  type PricesLookupBody,
  type PricesMakeManualInput,
  type PricesUpdateShareInput,
  pricesCreateManual,
  pricesCreateManualBodySchema,
  pricesCreateMarket,
  pricesCreateMarketBodySchema,
  pricesDeleteShare,
  pricesDeleteShareInputSchema,
  pricesFillHistory,
  pricesFillHistoryInputSchema,
  pricesLookup,
  pricesLookupBodySchema,
  pricesMakeManual,
  pricesMakeManualInputSchema,
  pricesUpdateShare,
  pricesUpdateShareInputSchema,
} from "./shares.js";

/**
 * The price service's internal routes, which only the API calls, with
 * `Authorization: Bearer <PRICES_TOKEN>`. They are left out of the OpenAPI
 * document.
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

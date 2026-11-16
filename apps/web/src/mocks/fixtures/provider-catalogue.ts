import type { Listing } from "@fpr/contracts";
import { fixtureId } from "./random.ts";
import type { FixtureShare } from "./shares.ts";

/**
 * What the price provider knows beyond the stored shares: a listing with an
 * ISIN, stored when looked up, and one without, stored once a member types
 * its ISIN.
 */
export const providerCatalogue: {
  withIsin: FixtureShare[];
  withoutIsin: Listing[];
} = {
  withIsin: [
    {
      key: "water",
      id: fixtureId(212),
      isin: "IE00FPRWTR13",
      name: "Water Utilities ETF",
      symbol: "WATR.AS",
      exchange: "AS",
      tradingCurrency: "EUR",
      market: {
        firstPriceEur: 44,
        drift: 0.0003,
        volatility: 0.009,
        historyDays: 440,
      },
    },
  ],
  withoutIsin: [
    {
      symbol: "SPCE.DE",
      name: "Space Economy Fund",
      exchange: "DE",
      tradingCurrency: "EUR",
    },
  ],
};

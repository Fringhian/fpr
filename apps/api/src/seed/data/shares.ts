import type { Price, Share } from "@fpr/db";
import type { PersonKey } from "./people.js";

export type ListingKey = "apple" | "microsoft" | "lvmh" | "asml" | "spy";

/** The listing columns a market share always has. */
type ListingColumns = "providerSymbol" | "exchange" | "tradingCurrency";

/**
 * A market share's columns, with its listing set, and the seed-only fields
 * its closes are invented from.
 */
export interface SeedListing
  extends Pick<Share, "isin" | "name">,
    Readonly<{ [Column in ListingColumns]: NonNullable<Share[Column]> }> {
  key: ListingKey;
  /** The invented close, in EUR, a week before the race starts. */
  firstCloseEur: number;
  /** The mean change of the log price per trading day. */
  drift: number;
  /** The spread of the log price's change per trading day. */
  volatility: number;
}

/** Widely traded listings. Their closes are invented. */
export const listings: readonly SeedListing[] = [
  {
    key: "apple",
    isin: "US0378331005",
    name: "Apple Inc.",
    providerSymbol: "AAPL.US",
    exchange: "US",
    tradingCurrency: "USD",
    firstCloseEur: 185,
    drift: 0.0006,
    volatility: 0.016,
  },
  {
    key: "microsoft",
    isin: "US5949181045",
    name: "Microsoft Corporation",
    providerSymbol: "MSFT.US",
    exchange: "US",
    tradingCurrency: "USD",
    firstCloseEur: 390,
    drift: 0.0004,
    volatility: 0.014,
  },
  {
    key: "lvmh",
    isin: "FR0000121014",
    name: "LVMH Moët Hennessy Louis Vuitton",
    providerSymbol: "MC.PA",
    exchange: "PA",
    tradingCurrency: "EUR",
    firstCloseEur: 640,
    drift: -0.0002,
    volatility: 0.018,
  },
  {
    key: "asml",
    isin: "NL0010273215",
    name: "ASML Holding N.V.",
    providerSymbol: "ASML.AS",
    exchange: "AS",
    tradingCurrency: "EUR",
    firstCloseEur: 690,
    drift: 0.0008,
    volatility: 0.022,
  },
  {
    key: "spy",
    isin: "US78462F1030",
    name: "SPDR S&P 500 ETF Trust",
    providerSymbol: "SPY.US",
    exchange: "US",
    tradingCurrency: "USD",
    firstCloseEur: 520,
    drift: 0.0005,
    volatility: 0.009,
  },
];

export type ManualShareKey = "realEstate" | "privateEquity";

/** A manual price, entered by a seeded person on a day of the race. */
export interface SeedValuePoint extends Pick<Price, "priceEur"> {
  day: number;
  enteredBy: PersonKey;
  /** The value first entered, when someone edited it since. */
  edited?: Pick<Price, "priceEur"> & { enteredBy: PersonKey };
}

export interface SeedManualShare extends Pick<Share, "isin" | "name"> {
  key: ManualShareKey;
  createdBy: PersonKey;
  createdDay: number;
  valuePoints: readonly SeedValuePoint[];
}

/** Made-up manual shares, with invented ISINs. */
export const manualShares: readonly SeedManualShare[] = [
  {
    key: "realEstate",
    isin: "FRSEEDREAL09",
    name: "Example Real Estate Crowdfunding",
    createdBy: "robin",
    createdDay: 20,
    valuePoints: [
      { day: 20, priceEur: "10", enteredBy: "robin" },
      { day: 50, priceEur: "10.15", enteredBy: "robin" },
      { day: 80, priceEur: "10.32", enteredBy: "robin" },
      {
        day: 110,
        priceEur: "10.40",
        enteredBy: "alex",
        edited: { priceEur: "10.35", enteredBy: "robin" },
      },
      { day: 140, priceEur: "10.61", enteredBy: "robin" },
      { day: 170, priceEur: "10.66", enteredBy: "alex" },
      { day: 200, priceEur: "10.90", enteredBy: "robin" },
      { day: 230, priceEur: "11.02", enteredBy: "robin" },
    ],
  },
  {
    key: "privateEquity",
    isin: "FRSEEDPEQF01",
    name: "Example Private Equity Fund",
    createdBy: "robin",
    createdDay: 20,
    valuePoints: [
      { day: 20, priceEur: "1000", enteredBy: "robin" },
      { day: 100, priceEur: "1080", enteredBy: "robin" },
      { day: 160, priceEur: "1135.50", enteredBy: "robin" },
      { day: 220, priceEur: "1190", enteredBy: "robin" },
    ],
  },
];

export type ShareKey = ListingKey | ManualShareKey;

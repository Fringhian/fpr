import type { Currency } from "@fpr/contracts";
import type { PersonKey } from "./people.ts";
import { fixtureId } from "./random.ts";

/** How a market share's invented closes move. */
export type MarketModel = {
  /** The close the history starts at, in euros. */
  firstPriceEur: number;
  /** The mean change of the log price per trading day. */
  drift: number;
  /** The spread of that change. */
  volatility: number;
  /** How many days back the provider's history starts. */
  historyDays: number;
  /** Trading days before the last close that the closes stop: the share needs attention. */
  staleDays?: number;
};

export type ManualValue = {
  daysAgo: number;
  priceEur: string;
  by: PersonKey;
  /** The price it had before its last edit. */
  editedFrom?: string;
};

export type FixtureShare = {
  key: string;
  id: string;
  isin: string;
  name: string;
  symbol: string | null;
  exchange: string | null;
  tradingCurrency: Currency | null;
  /** A market share's model, `null` for one whose prices haven't arrived. */
  market: MarketModel | null;
  /** A manual share's value points. */
  values?: ManualValue[];
};

function market<const Key extends string>(
  n: number,
  share: Omit<FixtureShare, "id" | "tradingCurrency"> & {
    key: Key;
    tradingCurrency?: Currency;
  },
): FixtureShare & { key: Key } {
  return { id: fixtureId(n), tradingCurrency: "EUR", ...share };
}

function manual<const Key extends string>(
  n: number,
  share: Pick<FixtureShare, "isin" | "name"> & {
    key: Key;
    values: ManualValue[];
  },
): FixtureShare & { key: Key } {
  return {
    id: fixtureId(n),
    symbol: null,
    exchange: null,
    tradingCurrency: null,
    market: null,
    ...share,
  };
}

/**
 * Every stored share, all generic and invented: tracked funds, one whose
 * closes stopped, one whose prices haven't arrived, one nobody holds, and two
 * manual shares.
 */
export const fixtureShares = [
  market(201, {
    key: "world",
    isin: "IE00FPRWLD09",
    name: "World Index ETF",
    symbol: "WRLD.PA",
    exchange: "PA",
    market: {
      firstPriceEur: 92,
      drift: 0.0004,
      volatility: 0.008,
      historyDays: 440,
    },
  }),
  market(202, {
    key: "tech",
    isin: "LU0FPRTECH04",
    name: "Global Tech Fund",
    symbol: "GTEC.DE",
    exchange: "DE",
    market: {
      firstPriceEur: 240,
      drift: 0.0008,
      volatility: 0.016,
      historyDays: 440,
    },
  }),
  market(203, {
    key: "dividend",
    isin: "FR00FPRDIV03",
    name: "Europe Dividend ETF",
    symbol: "EDIV.PA",
    exchange: "PA",
    market: {
      firstPriceEur: 31,
      drift: 0.0002,
      volatility: 0.007,
      historyDays: 440,
    },
  }),
  market(204, {
    key: "emerging",
    isin: "IE00FPREMK01",
    name: "Emerging Markets ETF",
    symbol: "EMKT.AS",
    exchange: "AS",
    market: {
      firstPriceEur: 27.5,
      drift: 0.0001,
      volatility: 0.011,
      historyDays: 440,
    },
  }),
  market(205, {
    key: "energy",
    isin: "US0FPRCLEN09",
    name: "Clean Energy Fund",
    symbol: "CLEN.US",
    exchange: "US",
    tradingCurrency: "USD",
    market: {
      firstPriceEur: 14.2,
      drift: -0.0003,
      volatility: 0.02,
      historyDays: 440,
    },
  }),
  market(206, {
    key: "health",
    isin: "DE000FPRHLC2",
    name: "Healthcare Leaders",
    symbol: "HLTH.DE",
    exchange: "DE",
    market: {
      firstPriceEur: 61,
      drift: 0.0003,
      volatility: 0.01,
      historyDays: 200,
    },
  }),
  market(207, {
    key: "smallcaps",
    isin: "FR00FPRSMC03",
    name: "Small Caps Europe",
    symbol: "SMCE.PA",
    exchange: "PA",
    market: {
      firstPriceEur: 18,
      drift: 0.0002,
      volatility: 0.012,
      historyDays: 440,
      staleDays: 9,
    },
  }),
  market(208, {
    key: "robotics",
    isin: "IE00FPRROB05",
    name: "Robotics ETF",
    symbol: "ROBO.AS",
    exchange: "AS",
    market: null,
  }),
  market(209, {
    key: "gold",
    isin: "JE00FPRGLD08",
    name: "Gold Tracker",
    symbol: "GOLD.LSE",
    exchange: "LSE",
    tradingCurrency: "GBP",
    market: {
      firstPriceEur: 54,
      drift: 0.0005,
      volatility: 0.009,
      historyDays: 440,
    },
  }),
  manual(210, {
    key: "vineyard",
    isin: "FR00FPRVIN01",
    name: "Vineyard Estate Shares",
    values: [
      { daysAgo: 390, priceEur: "120.00", by: "alex" },
      { daysAgo: 300, priceEur: "124.50", by: "alex" },
      { daysAgo: 210, priceEur: "123.80", by: "robin" },
      { daysAgo: 120, priceEur: "129.00", by: "alex", editedFrom: "128.00" },
      { daysAgo: 30, priceEur: "133.20", by: "robin" },
    ],
  }),
  manual(211, {
    key: "wind",
    isin: "FR00FPRWND05",
    name: "Community Wind Farm",
    values: [
      { daysAgo: 280, priceEur: "50.00", by: "robin" },
      { daysAgo: 150, priceEur: "51.75", by: "robin" },
      { daysAgo: 45, priceEur: "53.10", by: "robin" },
    ],
  }),
] as const satisfies readonly FixtureShare[];

export type ShareKey = (typeof fixtureShares)[number]["key"];

export function fixtureShareId(key: ShareKey): string {
  const found = fixtureShares.find((share) => share.key === key);
  if (found === undefined) {
    throw new Error(`No fixture share ${key}`);
  }
  return found.id;
}

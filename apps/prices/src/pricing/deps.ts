import type { Db, HeldMarketShare } from "@fpr/db";
import type { Logger } from "pino";
import type { CallBudget } from "../market/budget.js";
import type { RatesClient } from "../market/frankfurter.js";
import type { PriceProvider } from "../providers/index.js";

/** What fetching and storing prices needs. */
export interface PricingDeps {
  db: Db;
  logger: Logger;
  provider: PriceProvider;
  rates: RatesClient;
  /** The day's provider calls. */
  budget: CallBudget;
  /** `RACE_TIMEZONE`. */
  timeZone: string;
  /** The current moment. Tests replace it. */
  now: () => Date;
}

/** A market share the provider prices. */
export type PricedShare = Pick<
  HeldMarketShare,
  "id" | "providerSymbol" | "tradingCurrency"
>;

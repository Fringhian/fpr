import type { Currency, Decimal, IsoDate } from "@fpr/contracts";

/** The implementations `PRICE_PROVIDER` selects from. */
export const providerNames = ["eodhd"] as const;

export type ProviderName = (typeof providerNames)[number];

/** A listing the provider returned for a lookup. */
export interface ProviderListing {
  /** The provider's symbol for the listing, such as `ABC.PA`. */
  symbol: string;
  /** `null` when the provider returns none, or one that is not a valid ISIN. */
  isin: string | null;
  name: string;
  /** The provider's exchange code, such as `PA` or `XETRA`. */
  exchange: string;
  /** The provider's country name for the listing, `null` when it has none. */
  country: string | null;
  /** The currency the provider quotes the listing in, such as `EUR` or `GBX`. */
  tradingCurrency: Currency;
  /** The provider's instrument type, such as `Common Stock`, `ETF`, or `FUND`. */
  type: string;
  /** Whether the provider marks it as the ISIN's primary listing, `null` when it doesn't say. */
  primary: boolean | null;
}

/** A listing's latest price, in its trading currency. */
export interface ProviderQuote {
  /** The symbol as it was requested. */
  symbol: string;
  /** A decimal string above zero, exactly as the provider sent it. */
  price: Decimal;
  /** When the price was traded. */
  at: Date;
}

/** A listing's closing price on a trading day, in its trading currency, as traded. */
export interface ProviderClose {
  date: IsoDate;
  /** A decimal string above zero, exactly as the provider sent it. */
  close: Decimal;
}

/**
 * The one interface every price provider implements. Every method logs each
 * HTTP call it makes, and rejects with a `ProviderError` when a call fails.
 */
export interface PriceProvider {
  readonly name: ProviderName;
  /** The most listings `latest` sends in one request. */
  readonly latestBatchSize: number;
  /** The listings matching an ISIN or a ticker. One call. */
  lookup(query: string): Promise<ProviderListing[]>;
  /**
   * The latest price of each listing, in as few requests as the provider
   * allows. A listing with no latest price, such as a fund or an unknown
   * symbol, is left out of the result.
   */
  latest(symbols: readonly string[]): Promise<ProviderQuote[]>;
  /**
   * The daily closes of a listing from `from` to `to`, both included, oldest
   * first. One call. Rejects with `not_found` for a symbol the provider
   * doesn't carry.
   */
  closes(symbol: string, from: IsoDate, to: IsoDate): Promise<ProviderClose[]>;
}

/**
 * `not_found`: the provider doesn't carry the symbol. `unavailable`: the call
 * failed, timed out, was refused, or returned a body that can't be read.
 */
export type ProviderErrorReason = "not_found" | "unavailable";

/** A failed provider call. Its message never holds the API key. */
export class ProviderError extends Error {
  override readonly name = "ProviderError";
  readonly reason: ProviderErrorReason;
  /** The HTTP status, when the provider answered. */
  readonly status: number | undefined;

  constructor(
    reason: ProviderErrorReason,
    message: string,
    options: { status?: number; cause?: unknown } = {},
  ) {
    super(message, { cause: options.cause });
    this.reason = reason;
    this.status = options.status;
  }
}

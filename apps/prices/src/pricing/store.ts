import type { Decimal, IsoDate } from "@fpr/contracts";
import { prices, shares } from "@fpr/db";
import type { Logger } from "pino";
import { type EurRates, RatesError } from "../market/rates.js";
import { dayIn } from "../market/time.js";
import type { ProviderClose, ProviderQuote } from "../providers/index.js";
import type { PricedShare, PricingDeps } from "./deps.js";

/** What a run fetched from the provider, in each share's trading currency. */
export interface FetchedPrices {
  closes: { share: PricedShare; closes: ProviderClose[] }[];
  quotes: { share: PricedShare; quote: ProviderQuote }[];
}

export interface StoredPrices {
  closesStored: number;
  /** The shares that got a new intraday price. */
  sharesPriced: string[];
  /** The shares with a price that could not be converted to EUR. */
  failed: Set<string>;
}

interface Point {
  share: PricedShare;
  day: IsoDate;
  price: Decimal;
}

/**
 * Converts what a run fetched to EUR, with one rates request for every day
 * it spans, and stores it: closes at 23:59:59 of their day, intraday prices
 * when newer than the share's latest. The shares are locked while their
 * prices are written, and a share turned manual meanwhile gets nothing.
 */
export async function storePrices(
  deps: PricingDeps,
  fetched: FetchedPrices,
  log: Logger,
): Promise<StoredPrices> {
  const closes = fetched.closes.flatMap(({ share, closes }) =>
    closes.map((close) => ({ share, day: close.date, price: close.close })),
  );
  const quotes = fetched.quotes.map(({ share, quote }) => ({
    share,
    day: dayIn(quote.at, deps.timeZone),
    price: quote.price,
    at: quote.at,
  }));
  const failed = new Set<string>();
  if (closes.length + quotes.length === 0) {
    return { closesStored: 0, sharesPriced: [], failed };
  }
  const rates = await fetchRates(deps, [...closes, ...quotes]);
  const toEur = (point: Point) => convert(point, rates, failed, log);
  const closeRows = closes.flatMap((point) => {
    const priceEur = toEur(point);
    return priceEur === undefined
      ? []
      : [{ shareId: point.share.id, day: point.day, priceEur }];
  });
  const quoteRows = quotes.flatMap((point) => {
    const priceEur = toEur(point);
    return priceEur === undefined
      ? []
      : [{ shareId: point.share.id, at: point.at, priceEur }];
  });
  const ids = [...new Set([...closes, ...quotes].map(({ share }) => share.id))];

  return deps.db.transaction().execute(async (trx) => {
    const market = new Set(
      (await shares.lockMarket(trx, ids)).map((share) => share.id),
    );
    const stillMarket = ({ shareId }: { shareId: string }) =>
      market.has(shareId);
    return {
      closesStored: await prices.insertCloses(
        trx,
        deps.timeZone,
        closeRows.filter(stillMarket),
      ),
      sharesPriced: await prices.insertIntradayIfNewer(
        trx,
        quoteRows.filter(stillMarket),
      ),
      failed,
    };
  });
}

/** The rates of every day the points span, or `undefined` when Frankfurter failed, which it logs. */
async function fetchRates(
  deps: PricingDeps,
  points: readonly Point[],
): Promise<EurRates | undefined> {
  const days = points.map(({ day }) => day).sort();
  const currencies = [
    ...new Set(points.map(({ share }) => share.tradingCurrency)),
  ];
  try {
    return await deps.rates.fetchRates(
      currencies,
      days[0] ?? "",
      days.at(-1) ?? "",
    );
  } catch (error) {
    if (error instanceof RatesError) {
      return undefined;
    }
    throw error;
  }
}

function convert(
  { share, day, price }: Point,
  rates: EurRates | undefined,
  failed: Set<string>,
  log: Logger,
): Decimal | undefined {
  if (share.tradingCurrency === "EUR") {
    return price;
  }
  if (rates === undefined) {
    failed.add(share.id);
    return undefined;
  }
  try {
    return rates.toEur(price, share.tradingCurrency, day);
  } catch (error) {
    if (!(error instanceof RatesError || error instanceof RangeError)) {
      throw error;
    }
    log.error(
      { shareId: share.id, symbol: share.providerSymbol, day, err: error },
      "price not converted to EUR, not stored",
    );
    failed.add(share.id);
    return undefined;
  }
}

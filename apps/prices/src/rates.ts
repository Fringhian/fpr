import {
  type Currency,
  currencySchema,
  type Decimal,
  dateSchema,
  type IsoDate,
} from "@fpr/contracts";
import type { Logger } from "pino";
import { z } from "zod";
import { divideDecimal, shiftDecimal } from "./decimal.js";
import { type Fetch, parseJsonExact } from "./providers/http.js";

/** Frankfurter's API, the European Central Bank's reference rates. */
export const frankfurterBaseUrl = "https://api.frankfurter.dev";

/** A rates request takes at most this long before it counts as failed. */
export const ratesTimeoutMs = 15_000;

/** The decimal places of a price converted to EUR, rounded half away from zero. */
export const eurPriceScale = 6;

/**
 * Currencies quoted in a fraction of another: a `GBX` price is in pence, a
 * hundredth of a pound, so it is divided by 100 and converted from `GBP`.
 */
const subunits: Readonly<
  Record<string, { currency: Currency; places: number }>
> = { GBX: { currency: "GBP", places: 2 } };

/** A rate above zero, as a decimal string: how much of a currency one euro buys. */
const rateSchema = z
  .string()
  .regex(/^(?:0|[1-9]\d*)(?:\.\d+)?$/)
  .refine((value) => /[1-9]/.test(value));

/** `GET /v1/{from}..{to}`: one entry per ECB working day. */
const timeSeriesSchema = z.object({
  base: z.literal("EUR"),
  rates: z.record(dateSchema, z.record(z.string(), z.unknown())),
});

/**
 * `unavailable`: Frankfurter failed, timed out, or answered with a body that
 * can't be read. `no_rate`: no rate for the currency was published on or
 * before the price's day within the fetched range.
 */
export type RatesErrorReason = "unavailable" | "no_rate";

export class RatesError extends Error {
  override readonly name = "RatesError";
  readonly reason: RatesErrorReason;
  /** The HTTP status, when Frankfurter answered. */
  readonly status: number | undefined;

  constructor(
    reason: RatesErrorReason,
    message: string,
    options: { status?: number | undefined; cause?: unknown } = {},
  ) {
    super(message, { cause: options.cause });
    this.reason = reason;
    this.status = options.status;
  }
}

/** The rates of one run's date range, held in memory and never stored. */
export interface EurRates {
  /** The first day of the range the rates were fetched for. */
  readonly from: IsoDate;
  /** The last day of the range the rates were fetched for. */
  readonly to: IsoDate;
  /**
   * The rate of a currency for a day: the one published that day, or the last
   * one published before it, on a weekend, a holiday, or before the day's
   * publication. Rejects a day outside the range with a `RangeError`, and
   * throws a `RatesError` `no_rate` when no rate was found.
   */
  rateOn(currency: Currency, day: IsoDate): Decimal;
  /**
   * A price in a currency, converted to EUR with the rate of its day, rounded
   * half away from zero to `eurPriceScale` decimal places. A `GBX` price is
   * divided by 100 and converted from `GBP`. A `EUR` price is returned as is.
   * Throws as `rateOn` does, and a `RangeError` for a price that rounds to
   * zero.
   */
  toEur(price: Decimal, currency: Currency, day: IsoDate): Decimal;
}

export interface RatesClientOptions {
  logger: Logger;
  /** `RATES_URL`. Defaults to `frankfurterBaseUrl`. */
  baseUrl?: string;
  /** Defaults to the global `fetch`. Tests pass a mock. */
  fetch?: Fetch;
}

export interface RatesClient {
  /**
   * The rates from `from` to `to`, both included, with the last rates
   * published before `from`. One request, for every currency the ECB
   * publishes, sent only when one of `currencies` is not `EUR`. Rejects with a
   * `RatesError` `unavailable` when the request fails.
   */
  fetchRates(
    currencies: readonly Currency[],
    from: IsoDate,
    to: IsoDate,
  ): Promise<EurRates>;
}

/** The currency a rate is published for, and the places its price shifts by. */
function rateCurrency(currency: Currency): {
  currency: Currency;
  places: number;
} {
  return subunits[currency] ?? { currency, places: 0 };
}

/** Builds the converter over rates keyed by day, then by currency. */
export function eurRates(
  from: IsoDate,
  to: IsoDate,
  rates: ReadonlyMap<IsoDate, ReadonlyMap<Currency, Decimal>>,
): EurRates {
  const days = [...rates.keys()].sort();

  const converter: EurRates = {
    from,
    to,
    rateOn(currency, day) {
      if (!dateSchema.safeParse(day).success || day < from || day > to) {
        throw new RangeError(`Expected a day from ${from} to ${to}: ${day}`);
      }
      for (let index = days.length - 1; index >= 0; index -= 1) {
        const published = days[index];
        if (published === undefined || published > day) {
          continue;
        }
        const rate = rates.get(published)?.get(currency);
        if (rate !== undefined) {
          return rate;
        }
      }
      throw new RatesError(
        "no_rate",
        `No ${currency} rate on or before ${day}`,
      );
    },
    toEur(price, currency, day) {
      if (currency === "EUR") {
        return price;
      }
      const quoted = rateCurrency(currency);
      const rate = converter.rateOn(quoted.currency, day);
      const eur = divideDecimal(
        shiftDecimal(price, quoted.places),
        rate,
        eurPriceScale,
      );
      if (!/[1-9]/.test(eur)) {
        throw new RangeError(
          `${price} ${currency} rounds to 0 EUR at ${eurPriceScale} places`,
        );
      }
      return eur;
    },
  };
  return converter;
}

/**
 * The exchange-rate client, backed by Frankfurter. See
 * `docs/architecture/prices.md` › Currency. Each request writes one log line.
 */
export function createRatesClient(options: RatesClientOptions): RatesClient {
  const { logger } = options;
  const baseUrl = (options.baseUrl ?? frankfurterBaseUrl).replace(/\/+$/, "");
  const send = options.fetch ?? fetch;

  return {
    async fetchRates(currencies, from, to) {
      if (
        !dateSchema.safeParse(from).success ||
        !dateSchema.safeParse(to).success ||
        from > to
      ) {
        throw new RangeError(
          `Expected from <= to as YYYY-MM-DD: ${from}, ${to}`,
        );
      }
      const needed = currencies.some((currency) => currency !== "EUR");
      if (!needed) {
        return eurRates(from, to, new Map());
      }

      const line = { source: "frankfurter", from, to };
      const started = performance.now();
      const duration = (): number => Math.round(performance.now() - started);
      const fail = (
        message: string,
        fields: { status?: number; err?: unknown },
      ): never => {
        logger.error(
          { ...line, ...fields, duration: duration() },
          `rates call failed: ${message}`,
        );
        throw new RatesError("unavailable", `frankfurter: ${message}`, {
          status: fields.status,
          cause: fields.err,
        });
      };

      let response: Response;
      try {
        response = await send(new URL(`${baseUrl}/v1/${from}..${to}`), {
          headers: { Accept: "application/json" },
          signal: AbortSignal.timeout(ratesTimeoutMs),
        });
      } catch (error) {
        return fail("no response", { err: error });
      }

      const { status } = response;
      if (!response.ok) {
        await response.body?.cancel();
        return fail(`HTTP ${status}`, { status });
      }

      let body: z.infer<typeof timeSeriesSchema>;
      try {
        body = timeSeriesSchema.parse(parseJsonExact(await response.text()));
      } catch (error) {
        return fail("unreadable body", { status, err: error });
      }

      const rates = new Map<IsoDate, Map<Currency, Decimal>>();
      let dropped = 0;
      for (const [day, row] of Object.entries(body.rates)) {
        const dayRates = new Map<Currency, Decimal>();
        for (const [currency, value] of Object.entries(row)) {
          const code = currencySchema.safeParse(currency);
          const rate = rateSchema.safeParse(value);
          if (code.success && rate.success) {
            dayRates.set(code.data, rate.data);
          } else {
            dropped += 1;
          }
        }
        rates.set(day, dayRates);
      }
      if (dropped > 0) {
        logger.warn({ ...line, dropped }, "rates without a usable value");
      }
      logger.info(
        { ...line, days: rates.size, status, duration: duration() },
        "rates call",
      );
      return eurRates(from, to, rates);
    },
  };
}

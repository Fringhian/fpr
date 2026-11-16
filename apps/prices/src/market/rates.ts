import {
  type Currency,
  type Decimal,
  dateSchema,
  type IsoDate,
} from "@fpr/contracts";
import Big from "big.js";

/** The decimal places of a price converted to EUR, rounded half away from zero. */
export const eurPriceScale = 6;

/**
 * A `Big` whose division rounds once, half away from zero, to
 * `eurPriceScale` decimal places. Multiplication stays exact.
 */
const EurBig = Big();
EurBig.DP = eurPriceScale;
EurBig.RM = Big.roundHalfUp;

/**
 * Currencies quoted in a fraction of another: a `GBX` price is in pence, a
 * hundredth of a pound, so it is divided by 100 and converted from `GBP`.
 */
const subunits: Readonly<
  Record<string, { currency: Currency; perUnit: number }>
> = { GBX: { currency: "GBP", perUnit: 100 } };

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

/** The currency a rate is published for, and how many of the quoted unit make one of it. */
function rateCurrency(currency: Currency): {
  currency: Currency;
  perUnit: number;
} {
  return subunits[currency] ?? { currency, perUnit: 1 };
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
      // The subunit goes into the divisor, so the price is rounded only once:
      // 1234.5 GBX at 0.82805 is 1234.5 / 82.805.
      const eur = new EurBig(price).div(new EurBig(rate).times(quoted.perUnit));
      if (eur.eq(0)) {
        throw new RangeError(
          `${price} ${currency} rounds to 0 EUR at ${eurPriceScale} places`,
        );
      }
      return eur.toFixed();
    },
  };
  return converter;
}

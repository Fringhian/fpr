import {
  type Currency,
  currencySchema,
  type Decimal,
  dateSchema,
  type IsoDate,
} from "@fpr/contracts";
import type { Logger } from "pino";
import { z } from "zod";
import { type Fetch, parseJsonExact } from "../providers/http.js";
import { type EurRates, eurRates, RatesError } from "./rates.js";

/** Frankfurter's API, the European Central Bank's reference rates. */
export const frankfurterBaseUrl = "https://api.frankfurter.dev";

export const ratesTimeoutMs = 15_000;

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

type TimeSeries = z.infer<typeof timeSeriesSchema>;

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

/**
 * The exchange-rate client, backed by Frankfurter. See
 * `docs/architecture/prices.md` › Currency. Each request writes one log line.
 */
export function createRatesClient(options: {
  logger: Logger;
  /** `RATES_URL`. Defaults to `frankfurterBaseUrl`. */
  baseUrl?: string;
  /** Defaults to the global `fetch`. */
  fetch?: Fetch;
}): RatesClient {
  const { logger } = options;
  const baseUrl = (options.baseUrl ?? frankfurterBaseUrl).replace(/\/+$/, "");
  const send = options.fetch ?? fetch;

  return {
    async fetchRates(currencies, from, to) {
      assertRange(from, to);
      if (currencies.every((currency) => currency === "EUR")) {
        return eurRates(from, to, new Map());
      }
      const call = startCall(logger, from, to);
      const { status, body } = await requestTimeSeries(
        send,
        `${baseUrl}/v1/${from}..${to}`,
        call,
      );
      const { rates, dropped } = readRates(body);
      if (dropped > 0) {
        logger.warn({ ...call.line, dropped }, "rates without a usable value");
      }
      logger.info(
        { ...call.line, days: rates.size, status, duration: call.duration() },
        "rates call",
      );
      return eurRates(from, to, rates);
    },
  };
}

function assertRange(from: IsoDate, to: IsoDate): void {
  if (
    !dateSchema.safeParse(from).success ||
    !dateSchema.safeParse(to).success ||
    from > to
  ) {
    throw new RangeError(`Expected from <= to as YYYY-MM-DD: ${from}, ${to}`);
  }
}

interface RatesCall {
  line: { source: "frankfurter"; from: IsoDate; to: IsoDate };
  duration(): number;
  fail(message: string, fields: { status?: number; err?: unknown }): never;
}

function startCall(logger: Logger, from: IsoDate, to: IsoDate): RatesCall {
  const line = { source: "frankfurter", from, to } as const;
  const started = performance.now();
  const duration = (): number => Math.round(performance.now() - started);
  return {
    line,
    duration,
    fail(message, fields) {
      logger.error(
        { ...line, ...fields, duration: duration() },
        `rates call failed: ${message}`,
      );
      throw new RatesError("unavailable", `frankfurter: ${message}`, {
        status: fields.status,
        cause: fields.err,
      });
    },
  };
}

async function requestTimeSeries(
  send: Fetch,
  url: string,
  call: RatesCall,
): Promise<{ status: number; body: TimeSeries }> {
  let response: Response;
  try {
    response = await send(new URL(url), {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(ratesTimeoutMs),
    });
  } catch (error) {
    return call.fail("no response", { err: error });
  }

  const { status } = response;
  if (!response.ok) {
    await response.body?.cancel();
    return call.fail(`HTTP ${status}`, { status });
  }

  try {
    const body = timeSeriesSchema.parse(parseJsonExact(await response.text()));
    return { status, body };
  } catch (error) {
    return call.fail("unreadable body", { status, err: error });
  }
}

function readRates(body: TimeSeries): {
  rates: Map<IsoDate, Map<Currency, Decimal>>;
  dropped: number;
} {
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
  return { rates, dropped };
}

import {
  currencySchema,
  dateSchema,
  decimalSchema,
  isinSchema,
} from "@fpr/contracts";
import type { Logger } from "pino";
import { z } from "zod";
import {
  callProvider,
  type Fetch,
  type ProviderCallFields,
  type ProviderHttp,
} from "./http.js";
import {
  type PriceProvider,
  type ProviderClose,
  ProviderError,
  type ProviderListing,
  type ProviderQuote,
} from "./provider.js";

/** EODHD's API. */
export const eodhdBaseUrl = "https://eodhd.com/api";

/**
 * The most listings one real-time request carries: the symbol in the path and
 * up to 19 more in `s`. EODHD bills one call per listing whatever the batch.
 */
export const eodhdLatestBatchSize = 20;

/** The most listings a search returns. A search costs one call whatever its size. */
export const eodhdSearchLimit = 50;

/** A decimal string above zero. EODHD sends `0` or `"NA"` for a missing price. */
const positiveDecimalSchema = decimalSchema.refine(
  (value) => !value.startsWith("-") && /[1-9]/.test(value),
  { error: "Expected a price above zero" },
);

/** One listing of `GET /search/{query}`. */
const searchItemSchema = z.object({
  Code: z.string().trim().min(1),
  Exchange: z.string().trim().min(1),
  Name: z.string().trim().min(1),
  Type: z.string().nullish(),
  Country: z.string().nullish(),
  Currency: currencySchema,
  ISIN: z.string().nullish(),
  isPrimary: z.boolean().nullish(),
});

/** One quote of `GET /real-time/{symbol}`. `timestamp` is in Unix seconds. */
const quoteSchema = z.object({
  code: z.string().min(1),
  timestamp: z.string().regex(/^\d+$/),
  close: positiveDecimalSchema,
});

/** One trading day of `GET /eod/{symbol}`. */
const eodRowSchema = z.object({
  date: dateSchema,
  close: positiveDecimalSchema,
});

export interface EodhdProviderOptions {
  apiKey: string;
  logger: Logger;
  /** Defaults to the global `fetch`. */
  fetch?: Fetch;
  /** Defaults to `eodhdBaseUrl`. */
  baseUrl?: string;
}

/** Splits a list into runs of at most `size`. */
function chunk<T>(items: readonly T[], size: number): T[][] {
  const runs: T[][] = [];
  for (let start = 0; start < items.length; start += size) {
    runs.push(items.slice(start, start + size));
  }
  return runs;
}

/** The price provider backed by EODHD. See `docs/architecture/prices.md` › EODHD. */
export function createEodhdProvider(
  options: EodhdProviderOptions,
): PriceProvider {
  const { apiKey, logger } = options;
  const baseUrl = options.baseUrl ?? eodhdBaseUrl;
  const http: ProviderHttp = {
    provider: "eodhd",
    logger,
    fetch: options.fetch ?? fetch,
  };

  function endpointUrl(
    endpoint: string,
    symbol: string,
    params: Record<string, string> = {},
  ): URL {
    const url = new URL(`${baseUrl}/${endpoint}/${encodeURIComponent(symbol)}`);
    for (const [name, value] of Object.entries(params)) {
      url.searchParams.set(name, value);
    }
    url.searchParams.set("fmt", "json");
    url.searchParams.set("api_token", apiKey);
    return url;
  }

  /**
   * Keeps the rows that match `schema`, and logs how many were dropped. A body
   * that is not a list fails the call.
   */
  function readRows<S extends z.ZodType>(
    endpoint: string,
    fields: ProviderCallFields,
    rows: unknown,
    schema: S,
  ): z.infer<S>[] {
    if (!Array.isArray(rows)) {
      logger.error(
        { provider: http.provider, endpoint, ...fields },
        "provider call failed: unexpected body",
      );
      throw new ProviderError(
        "unavailable",
        `${http.provider} ${endpoint}: unexpected body`,
      );
    }
    const kept: z.infer<S>[] = [];
    for (const row of rows) {
      const parsed = schema.safeParse(row);
      if (parsed.success) {
        kept.push(parsed.data);
      }
    }
    const dropped = rows.length - kept.length;
    if (dropped > 0) {
      logger.warn(
        { provider: http.provider, endpoint, ...fields, dropped },
        "provider rows without a usable value",
      );
    }
    return kept;
  }

  return {
    name: http.provider,
    latestBatchSize: eodhdLatestBatchSize,

    async lookup(query) {
      const fields = { query };
      const body = await callProvider(http, {
        endpoint: "search",
        url: endpointUrl("search", query, { limit: String(eodhdSearchLimit) }),
        calls: 1,
        fields,
      });
      return readRows("search", fields, body, searchItemSchema).map(
        (item): ProviderListing => {
          const isin = isinSchema.safeParse(item.ISIN?.trim().toUpperCase());
          return {
            symbol: `${item.Code}.${item.Exchange}`,
            isin: isin.success ? isin.data : null,
            name: item.Name,
            exchange: item.Exchange,
            country: item.Country?.trim() || null,
            tradingCurrency: item.Currency,
            type: item.Type?.trim() ?? "",
            primary: item.isPrimary ?? null,
          };
        },
      );
    },

    async latest(symbols) {
      const unique = [...new Set(symbols)];
      const quotes: ProviderQuote[] = [];
      // One batch after another: a failed batch stops the rest from being billed.
      for (const batch of chunk(unique, eodhdLatestBatchSize)) {
        const [first, ...others] = batch;
        if (first === undefined) {
          continue;
        }
        const fields = { symbols: batch };
        const body = await callProvider(http, {
          endpoint: "real-time",
          url: endpointUrl(
            "real-time",
            first,
            others.length > 0 ? { s: others.join(",") } : {},
          ),
          calls: batch.length,
          fields,
        });
        // One symbol answers with an object, several with a list.
        const rows = Array.isArray(body) ? body : [body];
        const requested = new Map(
          batch.map((symbol) => [symbol.toUpperCase(), symbol]),
        );
        for (const row of readRows("real-time", fields, rows, quoteSchema)) {
          const symbol = requested.get(row.code.toUpperCase());
          if (symbol !== undefined) {
            quotes.push({
              symbol,
              price: row.close,
              at: new Date(Number(row.timestamp) * 1000),
            });
          }
        }
      }
      return quotes;
    },

    async closes(symbol, from, to) {
      if (
        !dateSchema.safeParse(from).success ||
        !dateSchema.safeParse(to).success ||
        from > to
      ) {
        throw new RangeError(
          `Expected from <= to as YYYY-MM-DD: ${from}, ${to}`,
        );
      }
      const fields = { symbols: [symbol], from, to };
      const body = await callProvider(http, {
        endpoint: "eod",
        url: endpointUrl("eod", symbol, { from, to, period: "d", order: "a" }),
        calls: 1,
        fields,
      });
      return readRows("eod", fields, body, eodRowSchema).map(
        (row): ProviderClose => ({ date: row.date, close: row.close }),
      );
    },
  };
}

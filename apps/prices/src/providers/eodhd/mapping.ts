import { isinSchema } from "@fpr/contracts";
import type { z } from "zod";
import type { ProviderCallFields, ProviderHttp } from "../http.js";
import {
  ProviderError,
  type ProviderListing,
  type ProviderQuote,
} from "../provider.js";
import type { quoteSchema, searchItemSchema } from "./schemas.js";

/**
 * Keeps the rows that match `schema`, and logs how many were dropped. A body
 * that is not a list fails the call.
 */
export function readRows<S extends z.ZodType>(
  http: ProviderHttp,
  endpoint: string,
  fields: ProviderCallFields,
  rows: unknown,
  schema: S,
): z.infer<S>[] {
  if (!Array.isArray(rows)) {
    http.logger.error(
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
    http.logger.warn(
      { provider: http.provider, endpoint, ...fields, dropped },
      "provider rows without a usable value",
    );
  }
  return kept;
}

export function toListing(
  item: z.infer<typeof searchItemSchema>,
): ProviderListing {
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
}

/**
 * The quotes of a batch, each under the symbol as it was requested. Codes
 * match in any case, and a row for a symbol outside the batch is dropped.
 */
export function toQuotes(
  batch: readonly string[],
  rows: readonly z.infer<typeof quoteSchema>[],
): ProviderQuote[] {
  const requested = new Map(
    batch.map((symbol) => [symbol.toUpperCase(), symbol]),
  );
  const quotes: ProviderQuote[] = [];
  for (const row of rows) {
    const symbol = requested.get(row.code.toUpperCase());
    if (symbol !== undefined) {
      quotes.push({
        symbol,
        price: row.close,
        at: new Date(Number(row.timestamp) * 1000),
      });
    }
  }
  return quotes;
}

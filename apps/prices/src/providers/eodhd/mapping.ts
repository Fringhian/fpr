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

/** EODHD's country names that differ from their English names. */
const countryAliases: Readonly<Record<string, string>> = {
  usa: "US",
  uk: "GB",
};

let codesByName: Map<string, string> | undefined;

/** Every two-letter region code by its English name, in lowercase. */
function regionCodes(): Map<string, string> {
  const names = new Intl.DisplayNames("en", { type: "region" });
  const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const codes = new Map<string, string>();
  for (const first of letters) {
    for (const second of letters) {
      const code = first + second;
      const name = names.of(code);
      // A retired code, such as DD or FX, is an alias of a current one.
      const current = new Intl.Locale(`und-${code}`).region === code;
      if (current && name !== undefined && name !== code) {
        codes.set(name.toLowerCase(), code);
      }
    }
  }
  return codes;
}

/** EODHD's country name, such as `France` or `USA`, as an ISO 3166 code. */
function countryCode(name: string | null | undefined): string | null {
  const key = name?.trim().toLowerCase();
  if (!key) {
    return null;
  }
  codesByName ??= regionCodes();
  return countryAliases[key] ?? codesByName.get(key) ?? null;
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
    countryCode: countryCode(item.Country),
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

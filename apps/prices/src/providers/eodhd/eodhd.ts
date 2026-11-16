import { dateSchema, type IsoDate } from "@fpr/contracts";
import type { Logger } from "pino";
import type { CallBudget } from "../../market/budget.js";
import { callProvider, type Fetch, type ProviderHttp } from "../http.js";
import type {
  PriceProvider,
  ProviderClose,
  ProviderListing,
  ProviderQuote,
} from "../provider.js";
import { readRows, toListing, toQuotes } from "./mapping.js";
import {
  eodRowSchema,
  positiveDecimalSchema,
  quoteSchema,
  searchItemSchema,
} from "./schemas.js";

export const eodhdBaseUrl = "https://eodhd.com/api";

/**
 * The most listings one real-time request carries: the symbol in the path and
 * up to 19 more in `s`. EODHD bills one call per listing whatever the batch.
 */
export const eodhdLatestBatchSize = 20;

/** The most listings a search returns. A search costs one call whatever its size. */
export const eodhdSearchLimit = 50;

export interface EodhdProviderOptions {
  apiKey: string;
  logger: Logger;
  /** The day's call budget every request is counted against. */
  budget: CallBudget;
  /** Defaults to the global `fetch`. */
  fetch?: Fetch;
  /** Defaults to `eodhdBaseUrl`. */
  baseUrl?: string;
}

/** What every EODHD request shares: its HTTP context, the API root and the key. */
interface EodhdClient {
  http: ProviderHttp;
  baseUrl: string;
  apiKey: string;
}

/** The price provider backed by EODHD. See `docs/architecture/prices.md` › EODHD. */
export function createEodhdProvider(
  options: EodhdProviderOptions,
): PriceProvider {
  const client: EodhdClient = {
    http: {
      provider: "eodhd",
      logger: options.logger,
      fetch: options.fetch ?? fetch,
      budget: options.budget,
    },
    baseUrl: options.baseUrl ?? eodhdBaseUrl,
    apiKey: options.apiKey,
  };
  return {
    name: client.http.provider,
    latestBatchSize: eodhdLatestBatchSize,
    lookup: (query) => lookup(client, query),
    listing: (symbol) => listing(client, symbol),
    latest: (symbols) => latest(client, symbols),
    closes: (symbol, from, to) => closes(client, symbol, from, to),
  };
}

async function lookup(
  client: EodhdClient,
  query: string,
): Promise<ProviderListing[]> {
  const fields = { query };
  const body = await callProvider(client.http, {
    endpoint: "search",
    url: endpointUrl(client, "search", query, {
      limit: String(eodhdSearchLimit),
    }),
    calls: 1,
    fields,
  });
  return readRows(client.http, "search", fields, body, searchItemSchema).map(
    toListing,
  );
}

/** Searches the symbol's code, which finds every exchange's listing, and keeps the symbol's. */
async function listing(
  client: EodhdClient,
  symbol: string,
): Promise<ProviderListing | undefined> {
  const code = symbol.slice(0, symbol.lastIndexOf(".")) || symbol;
  const wanted = symbol.toUpperCase();
  return (await lookup(client, code)).find(
    (candidate) => candidate.symbol.toUpperCase() === wanted,
  );
}

async function latest(
  client: EodhdClient,
  symbols: readonly string[],
): Promise<ProviderQuote[]> {
  const quotes: ProviderQuote[] = [];
  // One batch after another: a failed batch stops the rest from being billed.
  for (const batch of chunk([...new Set(symbols)], eodhdLatestBatchSize)) {
    quotes.push(...(await latestBatch(client, batch)));
  }
  return quotes;
}

async function latestBatch(
  client: EodhdClient,
  batch: readonly string[],
): Promise<ProviderQuote[]> {
  const [first, ...others] = batch;
  if (first === undefined) {
    return [];
  }
  const fields = { symbols: batch };
  const body = await callProvider(client.http, {
    endpoint: "real-time",
    url: endpointUrl(
      client,
      "real-time",
      first,
      others.length > 0 ? { s: others.join(",") } : {},
    ),
    calls: batch.length,
    fields,
  });
  // One symbol answers with an object, several with a list.
  const rows = Array.isArray(body) ? body : [body];
  return toQuotes(
    batch,
    readRows(client.http, "real-time", fields, rows, quoteSchema),
  );
}

async function closes(
  client: EodhdClient,
  symbol: string,
  from: IsoDate,
  to: IsoDate,
): Promise<ProviderClose[]> {
  if (
    !dateSchema.safeParse(from).success ||
    !dateSchema.safeParse(to).success ||
    from > to
  ) {
    throw new RangeError(`Expected from <= to as YYYY-MM-DD: ${from}, ${to}`);
  }
  const fields = { symbols: [symbol], from, to };
  const body = await callProvider(client.http, {
    endpoint: "eod",
    url: endpointUrl(client, "eod", symbol, {
      from,
      to,
      period: "d",
      order: "a",
    }),
    calls: 1,
    fields,
  });
  const kept: ProviderClose[] = [];
  for (const row of readRows(client.http, "eod", fields, body, eodRowSchema)) {
    if (positiveDecimalSchema.safeParse(row.close).success) {
      kept.push({ date: row.date, close: row.close });
    } else {
      client.http.logger.warn(
        { provider: "eodhd", endpoint: "eod", symbol, day: row.date },
        "provider close not above zero, skipped",
      );
    }
  }
  return kept;
}

function endpointUrl(
  client: EodhdClient,
  endpoint: string,
  symbol: string,
  params: Record<string, string> = {},
): URL {
  const url = new URL(
    `${client.baseUrl}/${endpoint}/${encodeURIComponent(symbol)}`,
  );
  for (const [name, value] of Object.entries(params)) {
    url.searchParams.set(name, value);
  }
  url.searchParams.set("fmt", "json");
  url.searchParams.set("api_token", client.apiKey);
  return url;
}

function chunk<T>(items: readonly T[], size: number): T[][] {
  const runs: T[][] = [];
  for (let start = 0; start < items.length; start += size) {
    runs.push(items.slice(start, start + size));
  }
  return runs;
}

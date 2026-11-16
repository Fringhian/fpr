import type { TestApp } from "./test-app.js";

/** What the mocked EODHD and Frankfurter answer. Prices are numbers, as EODHD sends them. */
export interface Market {
  /** `GET /search/{query}`: the listings of each query. */
  search?: Record<string, Record<string, unknown>[]>;
  /** `GET /eod/{symbol}`: each symbol's closes, filtered to the range asked. A symbol missing here answers 404. */
  eod?: Record<string, { date: string; close: number }[]>;
  /** `GET /real-time/{symbol}`: each symbol's latest price and its time. */
  latest?: Record<string, { close: number; at: string }>;
  /** `GET /v1/{from}..{to}`: the rates of each day, filtered to `to`. */
  rates?: Record<string, Record<string, number>>;
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function answerProvider(market: Market, url: URL): Response {
  const [, , endpoint, encoded = ""] = url.pathname.split("/");
  const subject = decodeURIComponent(encoded);
  if (endpoint === "search") {
    return json(market.search?.[subject] ?? []);
  }
  if (endpoint === "eod") {
    const rows = market.eod?.[subject];
    const from = url.searchParams.get("from") ?? "";
    const to = url.searchParams.get("to") ?? "";
    return rows === undefined
      ? new Response("Ticker Not Found.", { status: 404 })
      : json(rows.filter(({ date }) => date >= from && date <= to));
  }
  if (endpoint === "real-time") {
    const symbols = [subject, ...(url.searchParams.get("s")?.split(",") ?? [])];
    const rows = symbols.map((symbol) => {
      const quote = market.latest?.[symbol];
      return quote === undefined
        ? { code: symbol, timestamp: "NA", close: "NA" }
        : {
            code: symbol,
            timestamp: Date.parse(quote.at) / 1000,
            close: quote.close,
          };
    });
    return json(rows.length === 1 ? rows[0] : rows);
  }
  return json({ error: "unknown endpoint" }, 500);
}

function answerRates(market: Market, url: URL): Response {
  const to = url.pathname.split("..")[1] ?? "";
  const rates = Object.fromEntries(
    Object.entries(market.rates ?? {}).filter(([day]) => day <= to),
  );
  return json({ base: "EUR", rates });
}

/** Answers the app's provider and rates requests from `market`. */
export function mockMarket(app: TestApp, market: Market): void {
  app.provider.mockImplementation(async (input) =>
    answerProvider(market, new URL(String(input))),
  );
  app.rates.mockImplementation(async (input) =>
    answerRates(market, new URL(String(input))),
  );
}

/** The provider requests sent so far, as `endpoint subject` with the date range of an eod request. */
export function providerRequests(app: TestApp): string[] {
  return app.provider.mock.calls.map(([input]) => {
    const url = new URL(String(input));
    const [, , endpoint, encoded = ""] = url.pathname.split("/");
    const from = url.searchParams.get("from");
    const range =
      from === null ? "" : ` ${from}..${url.searchParams.get("to")}`;
    const others = url.searchParams.get("s");
    return `${endpoint} ${decodeURIComponent(encoded)}${others ? `,${others}` : ""}${range}`;
  });
}

/** Stores a market share someone holds from a moment, and resolves with its id. */
export async function holdMarketShare(
  app: TestApp,
  share: { symbol: string; currency: string; isin: string; heldFrom: string },
): Promise<string> {
  const { id } = await app.db
    .insertInto("shares")
    .values({
      isin: share.isin,
      name: `Example ${share.symbol}`,
      kind: "market",
      tradingCurrency: share.currency,
      providerSymbol: share.symbol,
      exchange: share.symbol.split(".")[1] ?? "US",
      historyStartsOn: null,
      createdBy: null,
    })
    .returning("id")
    .executeTakeFirstOrThrow();
  const person = await app.addPerson();
  await app.db
    .insertInto("portfolioChanges")
    .values({
      userId: person,
      shareId: id,
      quantityDelta: "2",
      effectiveAt: new Date(share.heldFrom),
      createdBy: person,
    })
    .execute();
  return id;
}

/** A share's prices, oldest first, as `at source priceEur`. */
export async function pricesOf(
  app: TestApp,
  shareId: string,
): Promise<string[]> {
  const rows = await app.db
    .selectFrom("prices")
    .select(["at", "source", "priceEur"])
    .where("shareId", "=", shareId)
    .orderBy("at")
    .execute();
  return rows.map(
    ({ at, source, priceEur }) => `${at.toISOString()} ${source} ${priceEur}`,
  );
}

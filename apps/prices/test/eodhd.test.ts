import { Writable } from "node:stream";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createCallBudget } from "../src/budget.js";
import { createLogger } from "../src/logger.js";
import {
  createEodhdProvider,
  eodhdLatestBatchSize,
} from "../src/providers/eodhd.js";
import type { Fetch } from "../src/providers/http.js";

const API_KEY = "test-eodhd-key";
const BASE = "https://eodhd.test/api";

let fetchMock: ReturnType<typeof vi.fn<Fetch>>;
let rawLines: string[];

/** A provider whose requests go to `fetchMock` and whose log lines go to `rawLines`. */
function provider() {
  const destination = new Writable({
    write(chunk, _encoding, callback) {
      rawLines.push(chunk.toString());
      callback();
    },
  });
  return createEodhdProvider({
    apiKey: API_KEY,
    logger: createLogger({ destination }),
    budget: createCallBudget({ limit: 1000, timeZone: "Europe/Paris" }),
    fetch: fetchMock,
    baseUrl: BASE,
  });
}

/** A JSON response. A string body is sent as is, so numbers keep their exact text. */
function json(body: unknown, status = 200): Response {
  return new Response(typeof body === "string" ? body : JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

/** The URL of the `index`th request. */
function requestUrl(index = 0): URL {
  const input = fetchMock.mock.calls[index]?.[0];
  if (!(input instanceof URL)) {
    throw new Error(`Request ${index} was not sent with a URL`);
  }
  return input;
}

function quote(code: string, close: number | string, timestamp = 1772442000) {
  return { code, timestamp, gmtoffset: 0, open: close, close, volume: 1200 };
}

beforeEach(() => {
  fetchMock = vi.fn<Fetch>();
  rawLines = [];
  // Every request must go through the mock: the real network is never reached.
  vi.stubGlobal(
    "fetch",
    vi.fn(() => {
      throw new Error("A test reached the global fetch");
    }),
  );
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("lookup", () => {
  it("returns every listing with its symbol, ISIN, exchange and currency", async () => {
    fetchMock.mockResolvedValue(
      json([
        {
          Code: "EXA",
          Exchange: "PA",
          Name: "Example Industries SA",
          Type: "Common Stock",
          Country: "France",
          Currency: "EUR",
          ISIN: "FR0000000001",
          isPrimary: true,
        },
        {
          Code: "SAMPLE",
          Exchange: "XETRA",
          Name: "Sample World Fund",
          Type: "FUND",
          Country: "Germany",
          Currency: "EUR",
          ISIN: "N/A",
        },
      ]),
    );

    const listings = await provider().lookup("EXA");

    expect(requestUrl().searchParams.get("api_token")).toBe(API_KEY);
    expect(listings).toEqual([
      {
        symbol: "EXA.PA",
        isin: "FR0000000001",
        name: "Example Industries SA",
        exchange: "PA",
        country: "France",
        tradingCurrency: "EUR",
        type: "Common Stock",
        primary: true,
      },
      {
        symbol: "SAMPLE.XETRA",
        isin: null,
        name: "Sample World Fund",
        exchange: "XETRA",
        country: "Germany",
        tradingCurrency: "EUR",
        type: "FUND",
        primary: null,
      },
    ]);
  });
});

describe("latest", () => {
  it("asks for several symbols in one request, keeping each price's exact text", async () => {
    fetchMock.mockResolvedValue(
      json(
        `[${[
          '{"code":"EXA.PA","timestamp":1772442000,"close":41.250}',
          '{"code":"SAMPLE.XETRA","timestamp":1772442060,"close":0.0731}',
        ].join(",")}]`,
      ),
    );

    const quotes = await provider().latest(["EXA.PA", "SAMPLE.XETRA"]);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const url = requestUrl();
    expect(url.pathname).toBe("/api/real-time/EXA.PA");
    expect(url.searchParams.get("s")).toBe("SAMPLE.XETRA");
    expect(quotes).toEqual([
      { symbol: "EXA.PA", price: "41.250", at: new Date(1772442000 * 1000) },
      {
        symbol: "SAMPLE.XETRA",
        price: "0.0731",
        at: new Date(1772442060 * 1000),
      },
    ]);
  });

  it(`sends at most ${eodhdLatestBatchSize} symbols per request`, async () => {
    const symbols = Array.from({ length: 45 }, (_, i) => `S${i}.PA`);
    fetchMock.mockImplementation(async (input) => {
      const url = input as URL;
      const first = decodeURIComponent(url.pathname.split("/").at(-1) ?? "");
      const others = url.searchParams.get("s")?.split(",") ?? [];
      return json([first, ...others].map((code) => quote(code, 10)));
    });

    const quotes = await provider().latest(symbols);

    const sizes = fetchMock.mock.calls.map((_, index) => {
      const url = requestUrl(index);
      return 1 + (url.searchParams.get("s")?.split(",").length ?? 0);
    });
    expect(sizes).toEqual([20, 20, 5]);
    expect(quotes.map((q) => q.symbol)).toEqual(symbols);
  });

  it("leaves out a listing with no latest price, such as a fund or an unknown symbol", async () => {
    fetchMock.mockResolvedValue(
      json([
        quote("EXA.PA", 41),
        { code: "SAMPLE.XETRA", timestamp: "NA", gmtoffset: 0, close: "NA" },
        quote("DEMO.LSE", 0),
      ]),
    );

    const quotes = await provider().latest([
      "EXA.PA",
      "SAMPLE.XETRA",
      "DEMO.LSE",
    ]);

    expect(quotes.map((q) => q.symbol)).toEqual(["EXA.PA"]);
  });

  it("stops at a failed batch, so later batches are not billed", async () => {
    const symbols = Array.from({ length: 30 }, (_, i) => `S${i}.PA`);
    fetchMock.mockResolvedValue(json({ error: "limit" }, 402));

    await expect(provider().latest(symbols)).rejects.toMatchObject({
      reason: "unavailable",
      status: 402,
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});

describe("closes", () => {
  it("returns close as traded, exactly as sent, and ignores adjusted_close", async () => {
    fetchMock.mockResolvedValue(
      json(
        "[" +
          '{"date":"2026-02-27","open":74,"high":75,"low":73,"close":74.3280,"adjusted_close":37.164,"volume":100},' +
          '{"date":"2026-03-02","open":75,"high":76,"low":74,"close":75.1,"adjusted_close":37.55,"volume":200}' +
          "]",
      ),
    );

    const closes = await provider().closes(
      "EXA.PA",
      "2026-02-23",
      "2026-03-02",
    );

    expect(closes).toEqual([
      { date: "2026-02-27", close: "74.3280" },
      { date: "2026-03-02", close: "75.1" },
    ]);
  });

  it("fails as not_found for a symbol EODHD doesn't carry", async () => {
    fetchMock.mockResolvedValue(
      new Response("Ticker Not Found.", { status: 404 }),
    );

    await expect(
      provider().closes("NONE.PA", "2026-02-23", "2026-03-02"),
    ).rejects.toMatchObject({
      name: "ProviderError",
      reason: "not_found",
      status: 404,
    });
  });
});

describe("every call", () => {
  it("fails as unavailable on an error status, no answer, or an unreadable body", async () => {
    fetchMock
      .mockResolvedValueOnce(json({ error: "server" }, 500))
      .mockRejectedValueOnce(new TypeError("fetch failed"))
      .mockResolvedValueOnce(new Response("<html>", { status: 200 }))
      .mockResolvedValueOnce(json({ message: "maintenance" }));
    const eodhd = provider();

    for (let call = 0; call < 4; call++) {
      await expect(eodhd.lookup("EXA")).rejects.toMatchObject({
        name: "ProviderError",
        reason: "unavailable",
      });
    }
  });

  it("never logs the API key or puts it in an error", async () => {
    fetchMock
      .mockResolvedValueOnce(json([]))
      .mockResolvedValueOnce(json({}, 401))
      .mockRejectedValueOnce(new TypeError("fetch failed"));
    const eodhd = provider();

    await eodhd.lookup("EXA");
    const unauthorized = await eodhd.latest(["EXA.PA"]).catch((e) => e);
    const offline = await eodhd
      .closes("EXA.PA", "2026-03-02", "2026-03-02")
      .catch((e) => e);

    expect(rawLines.join("")).not.toContain(API_KEY);
    expect(String(unauthorized)).not.toContain(API_KEY);
    expect(String(offline)).not.toContain(API_KEY);
  });
});

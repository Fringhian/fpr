import { Writable } from "node:stream";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createLogger } from "../logger.js";
import { createEodhdProvider, eodhdLatestBatchSize } from "./eodhd.js";
import type { Fetch } from "./http.js";
import { ProviderError } from "./provider.js";

const API_KEY = "test-eodhd-key";
const BASE = "https://eodhd.test/api";

type LogLine = Record<string, unknown>;

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
    fetch: fetchMock,
    baseUrl: BASE,
  });
}

function logLines(): LogLine[] {
  return rawLines
    .join("")
    .split("\n")
    .filter((line) => line.length > 0)
    .map((line) => JSON.parse(line) as LogLine);
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
  it("searches the query once, with the key and JSON format", async () => {
    fetchMock.mockResolvedValue(json([]));

    await provider().lookup("FR0000000001");

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const url = requestUrl();
    expect(url.origin + url.pathname).toBe(`${BASE}/search/FR0000000001`);
    expect(url.searchParams.get("api_token")).toBe(API_KEY);
    expect(url.searchParams.get("fmt")).toBe("json");
    expect(url.searchParams.get("limit")).toBe("50");
  });

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
          previousClose: 41.2,
          previousCloseDate: "2026-03-02",
        },
        {
          Code: "EXA",
          Exchange: "LSE",
          Name: "Example Industries SA",
          Type: "Common Stock",
          Country: "UK",
          Currency: "GBX",
          ISIN: "FR0000000001",
          isPrimary: false,
        },
        {
          Code: "SAMPLE",
          Exchange: "XETRA",
          Name: "Sample World Fund",
          Type: "FUND",
          Country: "Germany",
          Currency: "EUR",
          ISIN: null,
        },
      ]),
    );

    const listings = await provider().lookup("EXA");

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
        symbol: "EXA.LSE",
        isin: "FR0000000001",
        name: "Example Industries SA",
        exchange: "LSE",
        country: "UK",
        tradingCurrency: "GBX",
        type: "Common Stock",
        primary: false,
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

  it("returns an ISIN that is not valid as none", async () => {
    fetchMock.mockResolvedValue(
      json([
        {
          Code: "EXA",
          Exchange: "PA",
          Name: "Example Industries SA",
          Type: "Common Stock",
          Country: "France",
          Currency: "EUR",
          ISIN: "N/A",
        },
      ]),
    );

    const [listing] = await provider().lookup("EXA");

    expect(listing?.isin).toBeNull();
  });

  it("drops a listing without a currency and logs it", async () => {
    fetchMock.mockResolvedValue(
      json([
        {
          Code: "EXA",
          Exchange: "PA",
          Name: "Example Industries SA",
          Currency: "EUR",
        },
        { Code: "BAD", Exchange: "PA", Name: "Broken Listing", Currency: "" },
      ]),
    );

    const listings = await provider().lookup("EX");

    expect(listings.map((listing) => listing.symbol)).toEqual(["EXA.PA"]);
    expect(logLines()).toContainEqual(
      expect.objectContaining({
        level: "warn",
        endpoint: "search",
        dropped: 1,
      }),
    );
  });

  it("fails as unavailable when the body is not a list", async () => {
    fetchMock.mockResolvedValue(json({ message: "maintenance" }));

    await expect(provider().lookup("EXA")).rejects.toMatchObject({
      name: "ProviderError",
      reason: "unavailable",
    });
  });
});

describe("latest", () => {
  it("sends nothing for no symbols", async () => {
    expect(await provider().latest([])).toEqual([]);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("asks for one symbol in the path, without s", async () => {
    fetchMock.mockResolvedValue(json(quote("EXA.PA", 41.25)));

    const quotes = await provider().latest(["EXA.PA"]);

    const url = requestUrl();
    expect(url.pathname).toBe("/api/real-time/EXA.PA");
    expect(url.searchParams.has("s")).toBe(false);
    expect(url.searchParams.get("api_token")).toBe(API_KEY);
    expect(quotes).toEqual([
      {
        symbol: "EXA.PA",
        price: "41.25",
        at: new Date(1772442000 * 1000),
      },
    ]);
  });

  it("asks for several symbols in one request: the first in the path, the rest in s", async () => {
    fetchMock.mockResolvedValue(
      json(
        `[${[
          '{"code":"EXA.PA","timestamp":1772442000,"close":41.250}',
          '{"code":"SAMPLE.XETRA","timestamp":1772442060,"close":0.0731}',
          '{"code":"DEMO.LSE","timestamp":1772442120,"close":1234.5}',
        ].join(",")}]`,
      ),
    );

    const quotes = await provider().latest([
      "EXA.PA",
      "SAMPLE.XETRA",
      "DEMO.LSE",
    ]);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const url = requestUrl();
    expect(url.pathname).toBe("/api/real-time/EXA.PA");
    expect(url.searchParams.get("s")).toBe("SAMPLE.XETRA,DEMO.LSE");
    expect(quotes).toEqual([
      { symbol: "EXA.PA", price: "41.250", at: new Date(1772442000 * 1000) },
      {
        symbol: "SAMPLE.XETRA",
        price: "0.0731",
        at: new Date(1772442060 * 1000),
      },
      { symbol: "DEMO.LSE", price: "1234.5", at: new Date(1772442120 * 1000) },
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

    expect(fetchMock).toHaveBeenCalledTimes(3);
    const sizes = fetchMock.mock.calls.map((_, index) => {
      const url = requestUrl(index);
      return 1 + (url.searchParams.get("s")?.split(",").length ?? 0);
    });
    expect(sizes).toEqual([20, 20, 5]);
    expect(quotes.map((q) => q.symbol)).toEqual(symbols);
  });

  it("asks for a repeated symbol once", async () => {
    fetchMock.mockResolvedValue(
      json([quote("EXA.PA", 41), quote("DEMO.LSE", 900)]),
    );

    await provider().latest(["EXA.PA", "DEMO.LSE", "EXA.PA"]);

    expect(requestUrl().searchParams.get("s")).toBe("DEMO.LSE");
  });

  it("leaves out a listing with no latest price, such as a fund", async () => {
    fetchMock.mockResolvedValue(
      json([
        quote("EXA.PA", 41),
        {
          code: "SAMPLE.XETRA",
          timestamp: "NA",
          gmtoffset: 0,
          close: "NA",
        },
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

  it("returns each symbol as it was requested", async () => {
    fetchMock.mockResolvedValue(json(quote("EXA.PA", 41)));

    const [first] = await provider().latest(["exa.pa"]);

    expect(first?.symbol).toBe("exa.pa");
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

  it("logs each batch with its symbols and the calls it costs", async () => {
    fetchMock.mockResolvedValue(json([quote("EXA.PA", 41), quote("B.PA", 2)]));

    await provider().latest(["EXA.PA", "B.PA"]);

    expect(logLines()).toContainEqual(
      expect.objectContaining({
        level: "info",
        message: "provider call",
        provider: "eodhd",
        endpoint: "real-time",
        symbols: ["EXA.PA", "B.PA"],
        calls: 2,
        status: 200,
      }),
    );
  });
});

describe("closes", () => {
  it("asks for the daily closes from one day to another", async () => {
    fetchMock.mockResolvedValue(json([]));

    await provider().closes("EXA.PA", "2026-02-23", "2026-03-02");

    const url = requestUrl();
    expect(url.pathname).toBe("/api/eod/EXA.PA");
    expect(url.searchParams.get("from")).toBe("2026-02-23");
    expect(url.searchParams.get("to")).toBe("2026-03-02");
    expect(url.searchParams.get("period")).toBe("d");
    expect(url.searchParams.get("order")).toBe("a");
    expect(url.searchParams.get("fmt")).toBe("json");
  });

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

    const failure = provider().closes("NONE.PA", "2026-02-23", "2026-03-02");

    await expect(failure).rejects.toBeInstanceOf(ProviderError);
    await expect(failure).rejects.toMatchObject({
      reason: "not_found",
      status: 404,
    });
    expect(logLines()).toContainEqual(
      expect.objectContaining({
        level: "warn",
        endpoint: "eod",
        symbols: ["NONE.PA"],
        status: 404,
        calls: 1,
      }),
    );
  });

  it("refuses a range that is not two days in order, without a call", async () => {
    const eodhd = provider();

    await expect(
      eodhd.closes("EXA.PA", "2026-03-02", "2026-02-23"),
    ).rejects.toBeInstanceOf(RangeError);
    await expect(
      eodhd.closes("EXA.PA", "02/03/2026", "2026-03-02"),
    ).rejects.toBeInstanceOf(RangeError);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe("every call", () => {
  it("logs the provider, endpoint, calls, status and duration", async () => {
    fetchMock.mockResolvedValue(json([]));

    await provider().lookup("EXA");

    const [line] = logLines();
    expect(line).toMatchObject({
      level: "info",
      service: "prices",
      message: "provider call",
      provider: "eodhd",
      endpoint: "search",
      query: "EXA",
      calls: 1,
      status: 200,
    });
    expect(typeof line?.duration).toBe("number");
  });

  it("fails as unavailable and logs an error when EODHD answers with an error", async () => {
    fetchMock.mockResolvedValue(json({ error: "server" }, 500));

    await expect(provider().lookup("EXA")).rejects.toMatchObject({
      reason: "unavailable",
      status: 500,
    });
    expect(logLines()).toContainEqual(
      expect.objectContaining({
        level: "error",
        endpoint: "search",
        status: 500,
      }),
    );
  });

  it("fails as unavailable and logs an error when EODHD doesn't answer", async () => {
    fetchMock.mockRejectedValue(new TypeError("fetch failed"));

    await expect(provider().lookup("EXA")).rejects.toMatchObject({
      reason: "unavailable",
    });
    expect(logLines()).toContainEqual(
      expect.objectContaining({ level: "error", endpoint: "search" }),
    );
  });

  it("fails as unavailable when the body is not JSON", async () => {
    fetchMock.mockResolvedValue(new Response("<html>", { status: 200 }));

    await expect(provider().lookup("EXA")).rejects.toMatchObject({
      reason: "unavailable",
    });
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

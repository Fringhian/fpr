import { Writable } from "node:stream";
import { decimalPattern } from "@fpr/contracts";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createLogger } from "./logger.js";
import type { Fetch } from "./providers/http.js";
import { createRatesClient, eurRates, RatesError } from "./rates.js";

const BASE = "https://rates.test";

type LogLine = Record<string, unknown>;

let fetchMock: ReturnType<typeof vi.fn<Fetch>>;
let rawLines: string[];

/** A client whose requests go to `fetchMock` and whose log lines go to `rawLines`. */
function client(baseUrl: string = BASE) {
  const destination = new Writable({
    write(chunk, _encoding, callback) {
      rawLines.push(chunk.toString());
      callback();
    },
  });
  return createRatesClient({
    logger: createLogger({ destination }),
    baseUrl,
    fetch: fetchMock,
  });
}

function logLines(): LogLine[] {
  return rawLines
    .join("")
    .split("\n")
    .filter((line) => line.length > 0)
    .map((line) => JSON.parse(line) as LogLine);
}

/** A JSON response sent as is, so numbers keep their exact text. */
function json(body: string, status = 200): Response {
  return new Response(body, {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function requestUrl(index = 0): URL {
  const input = fetchMock.mock.calls[index]?.[0];
  if (!(input instanceof URL)) {
    throw new Error(`Request ${index} was not sent with a URL`);
  }
  return input;
}

/**
 * Frankfurter's answer for Thursday 2024-12-24 to Friday 2024-12-27: no rates
 * on the 25th and 26th, ECB holidays. It starts with the last working day
 * before the range when the range starts on a day without rates.
 */
const christmas = `{"amount":1.0,"base":"EUR","start_date":"2024-12-24","end_date":"2024-12-27","rates":{
  "2024-12-24":{"GBP":0.82805,"USD":1.0395,"JPY":163.70},
  "2024-12-27":{"GBP":0.83098,"USD":1.0435,"JPY":164.40}}}`;

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

describe("fetchRates", () => {
  it("asks Frankfurter at RATES_URL for the run's date range, every currency", async () => {
    fetchMock.mockResolvedValue(json(christmas));

    await client().fetchRates(["USD"], "2024-12-24", "2024-12-27");

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const url = requestUrl();
    expect(url.origin).toBe(BASE);
    expect(url.pathname).toBe("/v1/2024-12-24..2024-12-27");
    expect(url.search).toBe("");
  });

  it("accepts RATES_URL with a trailing slash or a path", async () => {
    fetchMock.mockResolvedValue(json(christmas));

    await client("http://rates.internal:8080/frankfurter/").fetchRates(
      ["USD"],
      "2024-12-24",
      "2024-12-24",
    );

    expect(requestUrl().href).toBe(
      "http://rates.internal:8080/frankfurter/v1/2024-12-24..2024-12-24",
    );
  });

  it("sends nothing when every price is already in EUR", async () => {
    const rates = await client().fetchRates(
      ["EUR", "EUR"],
      "2024-12-24",
      "2024-12-27",
    );

    expect(fetchMock).not.toHaveBeenCalled();
    expect(rates.toEur("74.3280", "EUR", "2024-12-25")).toBe("74.3280");
  });

  it("fetches again on each run: rates are never kept", async () => {
    fetchMock.mockImplementation(async () => json(christmas));
    const rates = client();

    await rates.fetchRates(["USD"], "2024-12-24", "2024-12-27");
    await rates.fetchRates(["USD"], "2024-12-24", "2024-12-27");

    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("refuses a range that is not two days in order, without a request", async () => {
    await expect(
      client().fetchRates(["USD"], "2024-12-27", "2024-12-24"),
    ).rejects.toThrow(RangeError);
    await expect(
      client().fetchRates(["USD"], "2024-12-24", "tomorrow"),
    ).rejects.toThrow(RangeError);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("logs the request with its range, status and duration", async () => {
    fetchMock.mockResolvedValue(json(christmas));

    await client().fetchRates(["USD"], "2024-12-24", "2024-12-27");

    const [line] = logLines();
    expect(line).toMatchObject({
      level: "info",
      message: "rates call",
      source: "frankfurter",
      from: "2024-12-24",
      to: "2024-12-27",
      days: 2,
      status: 200,
    });
    expect(typeof line?.duration).toBe("number");
  });

  it("fails as unavailable and logs an error on an error status", async () => {
    fetchMock.mockResolvedValue(json(`{"message":"not found"}`, 404));

    const failure = await client()
      .fetchRates(["USD"], "2030-01-01", "2030-01-02")
      .catch((error: unknown) => error);

    expect(failure).toBeInstanceOf(RatesError);
    expect(failure).toMatchObject({ reason: "unavailable", status: 404 });
    expect(logLines()).toContainEqual(
      expect.objectContaining({
        level: "error",
        source: "frankfurter",
        status: 404,
      }),
    );
  });

  it("fails as unavailable when Frankfurter doesn't answer", async () => {
    fetchMock.mockRejectedValue(new TypeError("fetch failed"));

    await expect(
      client().fetchRates(["USD"], "2024-12-24", "2024-12-27"),
    ).rejects.toMatchObject({ name: "RatesError", reason: "unavailable" });
  });

  it("sends the request with a timeout", async () => {
    fetchMock.mockResolvedValue(json(christmas));

    await client().fetchRates(["USD"], "2024-12-24", "2024-12-27");

    expect(fetchMock.mock.calls[0]?.[1]?.signal).toBeInstanceOf(AbortSignal);
  });

  it.each([
    ["not JSON", "<html>"],
    ["another base", `{"base":"USD","rates":{}}`],
    ["no rates", `{"base":"EUR"}`],
  ])("fails as unavailable on a body with %s", async (_case, body) => {
    fetchMock.mockResolvedValue(json(body));

    await expect(
      client().fetchRates(["USD"], "2024-12-24", "2024-12-27"),
    ).rejects.toMatchObject({ reason: "unavailable" });
  });

  it("drops a rate without a usable value and logs it", async () => {
    fetchMock.mockResolvedValue(
      json(
        `{"base":"EUR","rates":{"2024-12-24":{"USD":1.0395,"GBP":0,"jpy":163.7}}}`,
      ),
    );

    const rates = await client().fetchRates(
      ["USD", "GBP"],
      "2024-12-24",
      "2024-12-24",
    );

    expect(rates.rateOn("USD", "2024-12-24")).toBe("1.0395");
    expect(() => rates.rateOn("GBP", "2024-12-24")).toThrow(RatesError);
    expect(logLines()).toContainEqual(
      expect.objectContaining({ level: "warn", dropped: 2 }),
    );
  });
});

describe("rateOn", () => {
  async function christmasRates() {
    fetchMock.mockResolvedValue(json(christmas));
    return client().fetchRates(["USD"], "2024-12-24", "2024-12-27");
  }

  it("keeps each rate exactly as Frankfurter sent it", async () => {
    const rates = await christmasRates();
    expect(rates.rateOn("JPY", "2024-12-24")).toBe("163.70");
  });

  it("uses the rate of the price's day", async () => {
    const rates = await christmasRates();
    expect(rates.rateOn("USD", "2024-12-24")).toBe("1.0395");
    expect(rates.rateOn("USD", "2024-12-27")).toBe("1.0435");
  });

  it("uses the last rate before a holiday", async () => {
    const rates = await christmasRates();
    expect(rates.rateOn("USD", "2024-12-25")).toBe("1.0395");
    expect(rates.rateOn("USD", "2024-12-26")).toBe("1.0395");
  });

  it("uses Friday's rate on a weekend", async () => {
    fetchMock.mockResolvedValue(
      json(
        `{"base":"EUR","start_date":"2024-01-05","end_date":"2024-01-05","rates":{"2024-01-05":{"USD":1.0921}}}`,
      ),
    );
    const rates = await client().fetchRates(
      ["USD"],
      "2024-01-06",
      "2024-01-07",
    );

    expect(rates.rateOn("USD", "2024-01-06")).toBe("1.0921");
    expect(rates.rateOn("USD", "2024-01-07")).toBe("1.0921");
  });

  it("uses the previous working day's rate before the day's rate is published", async () => {
    // A Monday's intraday run at 11:00: Frankfurter has Friday's rates only.
    fetchMock.mockResolvedValue(
      json(`{"base":"EUR","rates":{"2026-11-13":{"USD":1.1052}}}`),
    );
    const rates = await client().fetchRates(
      ["USD"],
      "2026-11-16",
      "2026-11-16",
    );

    expect(rates.rateOn("USD", "2026-11-16")).toBe("1.1052");
  });

  it("falls back to an earlier day when a currency is missing on the price's day", () => {
    const rates = eurRates(
      "2024-12-23",
      "2024-12-24",
      new Map([
        ["2024-12-23", new Map([["USD", "1.04"]])],
        ["2024-12-24", new Map([["GBP", "0.82805"]])],
      ]),
    );
    expect(rates.rateOn("USD", "2024-12-24")).toBe("1.04");
  });

  it("fails as no_rate for a currency the ECB doesn't publish", async () => {
    const rates = await christmasRates();
    expect(() => rates.rateOn("XYZ", "2024-12-27")).toThrow(
      expect.objectContaining({ name: "RatesError", reason: "no_rate" }),
    );
  });

  it("refuses a day outside the fetched range", async () => {
    const rates = await christmasRates();
    expect(() => rates.rateOn("USD", "2024-12-23")).toThrow(RangeError);
    expect(() => rates.rateOn("USD", "2024-12-28")).toThrow(RangeError);
  });
});

describe("toEur", () => {
  async function christmasRates() {
    fetchMock.mockResolvedValue(json(christmas));
    return client().fetchRates(["USD", "GBX"], "2024-12-24", "2024-12-27");
  }

  it("divides a price by the rate of its day, exactly, to 6 decimal places", async () => {
    const rates = await christmasRates();
    // 100 / 1.0395 = 96.200096200...
    expect(rates.toEur("100", "USD", "2024-12-24")).toBe("96.200096");
    // 74.328 / 1.0435 = 71.229516052...
    expect(rates.toEur("74.328", "USD", "2024-12-27")).toBe("71.229516");
  });

  it("rounds half away from zero", () => {
    const rates = eurRates(
      "2024-12-24",
      "2024-12-24",
      new Map([["2024-12-24", new Map([["USD", "2"]])]]),
    );
    expect(rates.toEur("0.000001", "USD", "2024-12-24")).toBe("0.000001");
    expect(rates.toEur("0.000003", "USD", "2024-12-24")).toBe("0.000002");
  });

  it("converts with the last rate before it on a holiday", async () => {
    const rates = await christmasRates();
    expect(rates.toEur("100", "USD", "2024-12-25")).toBe("96.200096");
  });

  it("divides GBX by 100 before converting from GBP", async () => {
    const rates = await christmasRates();
    // 1234.5 pence = 12.345 GBP; 12.345 / 0.82805 = 14.908520017...
    expect(rates.toEur("1234.5", "GBX", "2024-12-24")).toBe("14.90852");
    expect(rates.toEur("12.345", "GBP", "2024-12-24")).toBe("14.90852");
  });

  it("returns a EUR price as is", async () => {
    const rates = await christmasRates();
    expect(rates.toEur("74.3280", "EUR", "2024-12-24")).toBe("74.3280");
  });

  it("returns decimal strings", async () => {
    const rates = await christmasRates();
    for (const price of ["1", "0.01", "999999.9999", "5"]) {
      expect(rates.toEur(price, "GBX", "2024-12-27")).toMatch(decimalPattern);
    }
  });

  it("refuses a price that rounds to zero", () => {
    const rates = eurRates(
      "2024-12-24",
      "2024-12-24",
      new Map([["2024-12-24", new Map([["IDR", "17000"]])]]),
    );
    expect(() => rates.toEur("0.001", "IDR", "2024-12-24")).toThrow(RangeError);
  });

  it("fails as no_rate without a rate for the currency", async () => {
    const rates = await client().fetchRates(
      ["EUR"],
      "2024-12-24",
      "2024-12-24",
    );
    expect(() => rates.toEur("1", "USD", "2024-12-24")).toThrow(RatesError);
  });
});

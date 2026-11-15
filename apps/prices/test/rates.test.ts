import { Writable } from "node:stream";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createLogger } from "../src/logger.js";
import type { Fetch } from "../src/providers/http.js";
import { createRatesClient, eurRates, RatesError } from "../src/rates.js";

const BASE = "https://rates.test";

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

function logLines(): Record<string, unknown>[] {
  return rawLines
    .join("")
    .split("\n")
    .filter((line) => line.length > 0)
    .map((line) => JSON.parse(line) as Record<string, unknown>);
}

/** A JSON response sent as is, so numbers keep their exact text. */
function json(body: string, status = 200): Response {
  return new Response(body, {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

/**
 * Frankfurter's answer for Tuesday 2024-12-24 to Friday 2024-12-27: no rates
 * on the 25th and 26th, ECB holidays.
 */
const christmas = `{"amount":1.0,"base":"EUR","start_date":"2024-12-24","end_date":"2024-12-27","rates":{
  "2024-12-24":{"GBP":0.82805,"USD":1.0395,"JPY":163.70},
  "2024-12-27":{"GBP":0.83098,"USD":1.0435,"JPY":164.40}}}`;

async function christmasRates() {
  fetchMock.mockResolvedValue(json(christmas));
  return client().fetchRates(["USD", "GBX"], "2024-12-24", "2024-12-27");
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

describe("fetching rates", () => {
  it("asks Frankfurter at RATES_URL for the run's date range, with a timeout", async () => {
    fetchMock.mockResolvedValue(json(christmas));

    await client("http://rates.internal:8080/frankfurter/").fetchRates(
      ["USD"],
      "2024-12-24",
      "2024-12-27",
    );

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(String(fetchMock.mock.calls[0]?.[0])).toBe(
      "http://rates.internal:8080/frankfurter/v1/2024-12-24..2024-12-27",
    );
    expect(fetchMock.mock.calls[0]?.[1]?.signal).toBeInstanceOf(AbortSignal);
  });

  it("sends nothing when every price is already in EUR", async () => {
    const rates = await client().fetchRates(
      ["EUR"],
      "2024-12-24",
      "2024-12-27",
    );

    expect(fetchMock).not.toHaveBeenCalled();
    expect(rates.toEur("74.3280", "EUR", "2024-12-25")).toBe("74.3280");
  });

  it("fails as unavailable and logs an error on an error status, no answer, or an unreadable body", async () => {
    fetchMock.mockResolvedValueOnce(json(`{"message":"not found"}`, 404));
    await expect(
      client().fetchRates(["USD"], "2030-01-01", "2030-01-02"),
    ).rejects.toMatchObject({ reason: "unavailable", status: 404 });
    expect(logLines()).toContainEqual(
      expect.objectContaining({ level: "error", status: 404 }),
    );

    fetchMock.mockRejectedValueOnce(new TypeError("fetch failed"));
    await expect(
      client().fetchRates(["USD"], "2024-12-24", "2024-12-27"),
    ).rejects.toBeInstanceOf(RatesError);

    fetchMock.mockResolvedValueOnce(json(`{"base":"USD","rates":{}}`));
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

describe("the rate of a day", () => {
  it("uses the day's rate, or the last one before a holiday", async () => {
    const rates = await christmasRates();
    expect(rates.rateOn("USD", "2024-12-24")).toBe("1.0395");
    expect(rates.rateOn("USD", "2024-12-26")).toBe("1.0395");
    expect(rates.rateOn("USD", "2024-12-27")).toBe("1.0435");
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

  it("fails as no_rate for a currency the ECB doesn't publish", async () => {
    const rates = await christmasRates();
    expect(() => rates.rateOn("XYZ", "2024-12-27")).toThrow(
      expect.objectContaining({ name: "RatesError", reason: "no_rate" }),
    );
  });
});

describe("converting to EUR", () => {
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
    expect(rates.toEur("0.000003", "USD", "2024-12-24")).toBe("0.000002");
  });

  it("divides GBX by 100 before converting from GBP", async () => {
    const rates = await christmasRates();
    // 1234.5 pence = 12.345 GBP; 12.345 / 0.82805 = 14.908520017...
    expect(rates.toEur("1234.5", "GBX", "2024-12-24")).toBe("14.90852");
  });

  it("refuses a price that rounds to zero", () => {
    const rates = eurRates(
      "2024-12-24",
      "2024-12-24",
      new Map([["2024-12-24", new Map([["IDR", "17000"]])]]),
    );
    expect(() => rates.toEur("0.001", "IDR", "2024-12-24")).toThrow(RangeError);
  });
});

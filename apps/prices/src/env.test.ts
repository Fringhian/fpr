import { describe, expect, it } from "vitest";
import { loadEnv } from "./env.js";

const valid = {
  DATABASE_URL: "postgres://localhost/fpr",
  PRICES_TOKEN: "test-token",
  PRICE_PROVIDER: "eodhd",
  PRICE_PROVIDER_API_KEY: "test-key",
};

describe("loadEnv", () => {
  it("defaults PORT to 3000", () => {
    expect(loadEnv(valid).PORT).toBe(3000);
  });

  it("defaults an empty PORT to 3000", () => {
    expect(loadEnv({ ...valid, PORT: "" }).PORT).toBe(3000);
  });

  it("names a missing DATABASE_URL", () => {
    expect(() => loadEnv({ ...valid, DATABASE_URL: undefined })).toThrow(
      /DATABASE_URL/,
    );
  });

  it("names a missing PRICES_TOKEN", () => {
    expect(() => loadEnv({ ...valid, PRICES_TOKEN: undefined })).toThrow(
      /PRICES_TOKEN/,
    );
  });

  it("rejects an empty PRICES_TOKEN", () => {
    expect(() => loadEnv({ ...valid, PRICES_TOKEN: "" })).toThrow(
      /PRICES_TOKEN/,
    );
  });

  it("reads the provider and its key", () => {
    expect(loadEnv(valid)).toMatchObject({
      PRICE_PROVIDER: "eodhd",
      PRICE_PROVIDER_API_KEY: "test-key",
    });
  });

  it("rejects a provider it has no implementation for", () => {
    expect(() => loadEnv({ ...valid, PRICE_PROVIDER: "other" })).toThrow(
      /PRICE_PROVIDER/,
    );
  });

  it("names a missing PRICE_PROVIDER", () => {
    expect(() => loadEnv({ ...valid, PRICE_PROVIDER: "" })).toThrow(
      /PRICE_PROVIDER/,
    );
  });

  it("defaults RATES_URL, PROVIDER_DAILY_CALL_LIMIT, and RACE_TIMEZONE", () => {
    expect(loadEnv(valid)).toMatchObject({
      RATES_URL: "https://api.frankfurter.dev",
      PROVIDER_DAILY_CALL_LIMIT: 1000,
      RACE_TIMEZONE: "Europe/Paris",
    });
  });

  it("defaults them when they are empty", () => {
    expect(
      loadEnv({
        ...valid,
        RATES_URL: "",
        PROVIDER_DAILY_CALL_LIMIT: "",
        RACE_TIMEZONE: "",
      }),
    ).toMatchObject({
      RATES_URL: "https://api.frankfurter.dev",
      PROVIDER_DAILY_CALL_LIMIT: 1000,
      RACE_TIMEZONE: "Europe/Paris",
    });
  });

  it("reads RATES_URL, PROVIDER_DAILY_CALL_LIMIT, and RACE_TIMEZONE", () => {
    expect(
      loadEnv({
        ...valid,
        RATES_URL: "http://rates.internal:8080",
        PROVIDER_DAILY_CALL_LIMIT: "250",
        RACE_TIMEZONE: "America/New_York",
      }),
    ).toMatchObject({
      RATES_URL: "http://rates.internal:8080",
      PROVIDER_DAILY_CALL_LIMIT: 250,
      RACE_TIMEZONE: "America/New_York",
    });
  });

  it("names a RATES_URL that is not a URL", () => {
    expect(() => loadEnv({ ...valid, RATES_URL: "frankfurter" })).toThrow(
      /RATES_URL/,
    );
  });

  it.each(["0", "-5", "12.5", "many"])(
    "names a PROVIDER_DAILY_CALL_LIMIT of %s",
    (limit) => {
      expect(() =>
        loadEnv({ ...valid, PROVIDER_DAILY_CALL_LIMIT: limit }),
      ).toThrow(/PROVIDER_DAILY_CALL_LIMIT/);
    },
  );

  it("names a RACE_TIMEZONE that is not a time zone", () => {
    expect(() => loadEnv({ ...valid, RACE_TIMEZONE: "Mars/Olympus" })).toThrow(
      /RACE_TIMEZONE/,
    );
  });

  it("names a missing PRICE_PROVIDER_API_KEY", () => {
    expect(() => loadEnv({ ...valid, PRICE_PROVIDER_API_KEY: "" })).toThrow(
      /PRICE_PROVIDER_API_KEY/,
    );
  });
});

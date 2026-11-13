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

  it("names a missing PRICE_PROVIDER_API_KEY", () => {
    expect(() => loadEnv({ ...valid, PRICE_PROVIDER_API_KEY: "" })).toThrow(
      /PRICE_PROVIDER_API_KEY/,
    );
  });
});

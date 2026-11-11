import { describe, expect, it } from "vitest";
import { loadEnv } from "./env.js";

const valid = {
  DATABASE_URL: "postgres://localhost/fpr",
  PRICES_TOKEN: "test-token",
};

describe("loadEnv", () => {
  it("defaults PORT to 3000", () => {
    expect(loadEnv(valid).PORT).toBe(3000);
  });

  it("defaults an empty PORT to 3000", () => {
    expect(loadEnv({ ...valid, PORT: "" }).PORT).toBe(3000);
  });

  it("names a missing DATABASE_URL", () => {
    expect(() => loadEnv({ PRICES_TOKEN: "x" })).toThrow(/DATABASE_URL/);
  });

  it("names a missing PRICES_TOKEN", () => {
    expect(() => loadEnv({ DATABASE_URL: "postgres://x" })).toThrow(
      /PRICES_TOKEN/,
    );
  });

  it("rejects an empty PRICES_TOKEN", () => {
    expect(() => loadEnv({ ...valid, PRICES_TOKEN: "" })).toThrow(
      /PRICES_TOKEN/,
    );
  });
});

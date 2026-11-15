import { describe, expect, it } from "vitest";
import { loadEnv } from "./env.js";

const valid = {
  DATABASE_URL: "postgres://fpr:fpr@db.example.test:5432/fpr",
  PUBLIC_URL: "https://fpr.example.test",
  BETTER_AUTH_SECRET: "a-test-secret-of-at-least-thirty-two-characters",
};

describe("loadEnv", () => {
  it("defaults PORT to 3000 and RACE_TIMEZONE to Europe/Paris", () => {
    expect(loadEnv(valid)).toEqual({
      ...valid,
      PORT: 3000,
      RACE_TIMEZONE: "Europe/Paris",
    });
  });

  it("names RACE_TIMEZONE when it is not a time zone", () => {
    expect(() => loadEnv({ ...valid, RACE_TIMEZONE: "Mars/Olympus" })).toThrow(
      "RACE_TIMEZONE",
    );
  });

  it("defaults an empty PORT to 3000", () => {
    expect(loadEnv({ ...valid, PORT: "" }).PORT).toBe(3000);
  });

  it("names an empty DATABASE_URL as missing", () => {
    expect(() => loadEnv({ ...valid, DATABASE_URL: "" })).toThrow(
      "DATABASE_URL",
    );
  });

  it("reads PORT as a number", () => {
    expect(loadEnv({ ...valid, PORT: "8080" }).PORT).toBe(8080);
  });

  it("refuses a BETTER_AUTH_SECRET under 32 characters", () => {
    expect(() =>
      loadEnv({ ...valid, BETTER_AUTH_SECRET: "too-short" }),
    ).toThrow("BETTER_AUTH_SECRET");
  });

  it.each(["DATABASE_URL", "PUBLIC_URL", "BETTER_AUTH_SECRET"])(
    "stops with the name of a missing %s",
    (name) => {
      const source: Record<string, string> = { ...valid };
      delete source[name];
      expect(() => loadEnv(source)).toThrow(name);
    },
  );

  it("names PUBLIC_URL when it is not a URL", () => {
    expect(() => loadEnv({ ...valid, PUBLIC_URL: "not a url" })).toThrow(
      "PUBLIC_URL",
    );
  });

  it("refuses a PORT outside 1 to 65535", () => {
    expect(() => loadEnv({ ...valid, PORT: "70000" })).toThrow("PORT");
  });
});

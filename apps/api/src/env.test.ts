import { describe, expect, it } from "vitest";
import { loadEnv } from "./env.js";

const valid = {
  DATABASE_URL: "postgres://fpr:fpr@db.example.test:5432/fpr",
  PUBLIC_URL: "https://fpr.example.test",
};

describe("loadEnv", () => {
  it("defaults PORT to 3000", () => {
    expect(loadEnv(valid)).toEqual({ ...valid, PORT: 3000 });
  });

  it("reads PORT as a number", () => {
    expect(loadEnv({ ...valid, PORT: "8080" }).PORT).toBe(8080);
  });

  it.each(["DATABASE_URL", "PUBLIC_URL"])(
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

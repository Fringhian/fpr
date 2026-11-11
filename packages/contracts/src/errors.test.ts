import { describe, expect, it } from "vitest";
import { errorCodes, errorSchema, errorStatus } from "./errors.js";

describe("errorSchema", () => {
  it("accepts a code with details", () => {
    const body = {
      error: { code: "holding_below_zero", details: { changeId: "c1" } },
    };
    expect(errorSchema.parse(body)).toEqual(body);
  });

  it("accepts a code without details", () => {
    const body = { error: { code: "not_found" } };
    expect(errorSchema.parse(body)).toEqual(body);
  });

  it("refuses an unknown code", () => {
    const body = { error: { code: "teapot" } };
    expect(errorSchema.safeParse(body).success).toBe(false);
  });
});

describe("errorStatus", () => {
  it("gives every code an HTTP status", () => {
    expect(Object.keys(errorStatus).sort()).toEqual([...errorCodes].sort());
  });
});

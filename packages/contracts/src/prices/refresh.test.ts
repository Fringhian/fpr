import { describe, expect, it } from "vitest";
import { pricesRefresh } from "./refresh.js";

describe("POST /refresh", () => {
  it("is declared without an input, with the run and provider codes", () => {
    const { route, inputSchema, errorMap } = pricesRefresh["~orpc"];
    expect(route).toMatchObject({ method: "POST", path: "/refresh" });
    expect(inputSchema).toBeUndefined();
    expect(Object.keys(errorMap).sort()).toEqual([
      "call_budget_used",
      "internal_error",
      "provider_unavailable",
      "refresh_running",
      "unauthenticated",
    ]);
  });
});

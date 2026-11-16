import { apiContract, type ShareSummary } from "@fpr/contracts";
import { createTestDatabase, type TestDatabase } from "@fpr/db/testing";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import type { Auth } from "../../src/auth/auth.js";
import { apiError } from "../../src/errors.js";
import { expectError } from "../access-support.js";
import {
  addSignedIn,
  apiRequest,
  createTestAuth,
  createTestPrices,
  parseOutput,
  serveApp,
  type TestPrices,
  type TestServer,
  unreachablePrices,
} from "../test-support.js";

let test: TestDatabase;
let auth: Auth;
let server: TestServer;
let prices: TestPrices;

beforeAll(async () => {
  test = await createTestDatabase();
  auth = createTestAuth(test.db);
  prices = createTestPrices();
  server = await serveApp({ db: test.db, auth, prices: prices.prices });
});

afterAll(async () => {
  await server.close();
  await test.drop();
});

beforeEach(() => prices.reset());

const { lookup } = apiContract.shares;

const share: ShareSummary = {
  id: "0196a1b2-0000-7000-8000-000000000001",
  isin: "FR0000000001",
  name: "Example Industries",
  kind: "market",
  symbol: "EXI.PA",
};

function post(cookie: string, body: Record<string, unknown>) {
  return apiRequest(server, "/shares/lookup", { method: "POST", cookie, body });
}

describe("POST /api/shares/lookup", () => {
  it("looks a query up at the price service, for a member", async () => {
    const member = await addSignedIn(server, test.db, auth, "member");
    const listing = {
      symbol: "EXI.XETRA",
      name: "Example Industries",
      exchange: "XETRA",
      tradingCurrency: "EUR",
    };
    prices.routes.lookup = async () => ({
      shares: [share],
      listings: [listing],
    });

    const response = await post(member.cookie, { query: "EXI" });

    expect(response.status).toBe(200);
    expect(parseOutput(lookup, await response.json())).toEqual({
      shares: [share],
      listings: [listing],
    });
    expect(prices.requests).toEqual([
      { method: "POST", path: "/lookup", body: { query: "EXI" } },
    ]);
  });

  it("stores a listing under the ISIN the member typed", async () => {
    const admin = await addSignedIn(server, test.db, auth, "admin");
    prices.routes.createMarket = async () => share;

    const response = await post(admin.cookie, {
      query: "EXI.PA",
      isin: share.isin,
    });

    expect(response.status).toBe(200);
    expect(parseOutput(lookup, await response.json())).toEqual({
      shares: [share],
      listings: [],
    });
    expect(prices.requests[0]).toMatchObject({
      path: "/shares/market",
      body: { symbol: "EXI.PA", isin: share.isin },
    });
  });

  it("forwards the price service's refusals with their details", async () => {
    const member = await addSignedIn(server, test.db, auth, "member");
    const body = { query: "EXI.PA", isin: share.isin };

    prices.routes.createMarket = async () => {
      throw apiError("isin_taken", { shareId: share.id });
    };
    await expectError(lookup, await post(member.cookie, body), "isin_taken", {
      shareId: share.id,
    });

    prices.routes.createMarket = async () => {
      throw apiError("not_found");
    };
    await expectError(lookup, await post(member.cookie, body), "not_found");

    prices.routes.lookup = async () => {
      throw apiError("call_budget_used");
    };
    await expectError(
      lookup,
      await post(member.cookie, { query: "EXI" }),
      "call_budget_used",
    );

    prices.routes.lookup = async () => {
      throw apiError("provider_unavailable");
    };
    await expectError(
      lookup,
      await post(member.cookie, { query: "EXI" }),
      "provider_unavailable",
    );
  });

  it("answers internal_error, not unauthenticated, when the price service refuses the API's token", async () => {
    const member = await addSignedIn(server, test.db, auth, "member");
    prices.routes.lookup = async () => {
      throw apiError("unauthenticated");
    };

    const response = await post(member.cookie, { query: "EXI" });

    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({
      error: { code: "internal_error" },
    });
  });

  it("refuses guests and anonymous viewers", async () => {
    for (const role of ["guest", "anonymous"] as const) {
      const viewer = await addSignedIn(server, test.db, auth, role);
      await expectError(
        lookup,
        await post(viewer.cookie, { query: "EXI" }),
        "forbidden",
      );
    }
    expect(prices.requests).toEqual([]);
  });
});

describe("POST /api/shares/lookup with the price service out of reach", () => {
  it("answers provider_unavailable", async () => {
    const other = await serveApp({
      db: test.db,
      auth,
      prices: unreachablePrices(),
    });
    try {
      const member = await addSignedIn(other, test.db, auth, "member");
      const response = await apiRequest(other, "/shares/lookup", {
        method: "POST",
        cookie: member.cookie,
        body: { query: "EXI" },
      });
      await expectError(lookup, response, "provider_unavailable");
      expect(
        other
          .lines()
          .some((line) => line.message === "price service unreachable"),
      ).toBe(true);
    } finally {
      await other.close();
    }
  });
});

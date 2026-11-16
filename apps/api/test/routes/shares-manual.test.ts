import { apiContract } from "@fpr/contracts";
import { createTestDatabase, type TestDatabase } from "@fpr/db/testing";
import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  type MockInstance,
  vi,
} from "vitest";
import type { Auth } from "../../src/auth/auth.js";
import { apiError } from "../../src/errors.js";
import { createSeriesCache } from "../../src/valuation/series-cache.js";
import { expectError } from "../access-support.js";
import {
  addSignedIn,
  apiRequest,
  createTestAuth,
  createTestPrices,
  parseOutput,
  serveApp,
  TEST_RACE_TIMEZONE,
  type TestPrices,
  type TestServer,
} from "../test-support.js";

let test: TestDatabase;
let auth: Auth;
let server: TestServer;
let prices: TestPrices;
let clearSeries: MockInstance;

beforeAll(async () => {
  test = await createTestDatabase();
  auth = createTestAuth(test.db);
  prices = createTestPrices();
  const series = createSeriesCache({
    db: test.db,
    timeZone: TEST_RACE_TIMEZONE,
  });
  clearSeries = vi.spyOn(series, "clear");
  server = await serveApp({ db: test.db, auth, prices: prices.prices, series });
});

afterAll(async () => {
  await server.close();
  await test.drop();
});

beforeEach(() => {
  prices.reset();
  clearSeries.mockClear();
});

const { createManual } = apiContract.shares;

const body = {
  isin: "XS0000000019",
  name: "Example Vineyard",
  priceEur: "41.00",
  at: "2026-03-02T17:30:00+01:00",
};

function post(cookie: string, sent: Record<string, unknown> = body) {
  return apiRequest(server, "/shares/manual", {
    method: "POST",
    cookie,
    body: sent,
  });
}

describe("POST /api/shares/manual", () => {
  it("creates the share at the price service, made by the member", async () => {
    const member = await addSignedIn(server, test.db, auth, "member");
    const share = {
      id: "0196a1b2-0000-7000-8000-000000000002",
      isin: body.isin,
      name: body.name,
      kind: "manual" as const,
      symbol: null,
    };
    prices.routes.createManual = async () => share;

    const response = await post(member.cookie);

    expect(response.status).toBe(201);
    expect(parseOutput(createManual, await response.json())).toEqual(share);
    expect(prices.requests).toEqual([
      {
        method: "POST",
        path: "/shares/manual",
        body: { ...body, createdBy: member.id },
      },
    ]);
    expect(clearSeries).toHaveBeenCalledOnce();
  });

  it("refuses a taken ISIN with the share that has it, and a future moment", async () => {
    const member = await addSignedIn(server, test.db, auth, "member");
    const shareId = "0196a1b2-0000-7000-8000-000000000003";

    prices.routes.createManual = async () => {
      throw apiError("isin_taken", { shareId });
    };
    await expectError(createManual, await post(member.cookie), "isin_taken", {
      shareId,
    });

    prices.routes.createManual = async () => {
      throw apiError("future_moment");
    };
    await expectError(createManual, await post(member.cookie), "future_moment");
    expect(clearSeries).not.toHaveBeenCalled();
  });

  it("refuses guests and anonymous viewers", async () => {
    for (const role of ["guest", "anonymous"] as const) {
      const viewer = await addSignedIn(server, test.db, auth, role);
      await expectError(createManual, await post(viewer.cookie), "forbidden");
    }
    expect(prices.requests).toEqual([]);
  });
});

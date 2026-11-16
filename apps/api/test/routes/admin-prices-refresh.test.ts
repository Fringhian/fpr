import { apiContract, type RefreshRun } from "@fpr/contracts";
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
  unreachablePrices,
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

const { refreshPrices, refreshState } = apiContract.admin;

const run: RefreshRun = {
  trigger: "request",
  status: "partial",
  startedAt: "2026-03-04T14:00:00.000Z",
  finishedAt: "2026-03-04T14:00:09.000Z",
  sharesPriced: 7,
  closesStored: 2,
  failures: 1,
};

const refresh = (cookie: string) =>
  apiRequest(server, "/admin/prices/refresh", { method: "POST", cookie });

describe("POST /api/admin/prices/refresh", () => {
  it("runs the refresh now, a partial one included, and clears the series", async () => {
    const admin = await addSignedIn(server, test.db, auth, "admin");
    prices.routes.refresh = async () => run;

    const response = await refresh(admin.cookie);

    expect(response.status).toBe(200);
    expect(parseOutput(refreshPrices, await response.json())).toEqual({
      sharesPriced: 7,
      finishedAt: run.finishedAt,
    });
    expect(clearSeries).toHaveBeenCalledOnce();
  });

  it("forwards a running refresh, the day's cap, and a refresh that priced nothing", async () => {
    const admin = await addSignedIn(server, test.db, auth, "admin");
    for (const code of [
      "refresh_running",
      "call_budget_used",
      "provider_unavailable",
    ] as const) {
      prices.routes.refresh = async () => {
        throw apiError(code);
      };
      await expectError(refreshPrices, await refresh(admin.cookie), code);
    }
  });

  it("refuses everyone but the admin", async () => {
    for (const role of ["member", "guest", "anonymous"] as const) {
      const viewer = await addSignedIn(server, test.db, auth, role);
      await expectError(
        refreshPrices,
        await refresh(viewer.cookie),
        "forbidden",
      );
    }
    expect(prices.requests).toEqual([]);
  });
});

describe("GET /api/admin/prices/refresh", () => {
  const state = {
    lastRunAt: run.finishedAt,
    lastResult: run,
    nextRunAt: "2026-03-04T14:30:00.000Z",
    runsToday: 11,
    cap: { callLimit: 1000, callsToday: 240, callsLeft: 760 },
  };

  it("reads the refresh's state, for the admin and anonymous viewers", async () => {
    prices.routes.refreshState = async () => state;
    for (const role of ["admin", "anonymous"] as const) {
      const viewer = await addSignedIn(server, test.db, auth, role);
      const response = await apiRequest(server, "/admin/prices/refresh", {
        cookie: viewer.cookie,
      });
      expect(response.status).toBe(200);
      expect(parseOutput(refreshState, await response.json())).toEqual(state);
    }
  });

  it("answers provider_unavailable while the price service is out of reach", async () => {
    const other = await serveApp({
      db: test.db,
      auth,
      prices: unreachablePrices(),
    });
    try {
      const admin = await addSignedIn(other, test.db, auth, "admin");
      await expectError(
        refreshState,
        await apiRequest(other, "/admin/prices/refresh", {
          cookie: admin.cookie,
        }),
        "provider_unavailable",
      );
    } finally {
      await other.close();
    }
  });

  it("refuses members and guests", async () => {
    for (const role of ["member", "guest"] as const) {
      const viewer = await addSignedIn(server, test.db, auth, role);
      await expectError(
        refreshState,
        await apiRequest(server, "/admin/prices/refresh", {
          cookie: viewer.cookie,
        }),
        "forbidden",
      );
    }
  });
});

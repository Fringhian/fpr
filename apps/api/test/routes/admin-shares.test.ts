import { type AdminShareGroups, apiContract } from "@fpr/contracts";
import { portfolioChanges, prices as priceRows, shares } from "@fpr/db";
import { createTestDatabase, type TestDatabase } from "@fpr/db/testing";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import type { Auth } from "../../src/auth/auth.js";
import { apiError } from "../../src/errors.js";
import { expectError } from "../access-support.js";
import {
  addShare,
  addSignedIn,
  apiRequest,
  createTestAuth,
  createTestPrices,
  parseOutput,
  pseudonymOf,
  serveApp,
  type TestPrices,
  type TestServer,
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

const { shares: listShares, makeManual } = apiContract.admin;

async function hold(userId: string, shareId: string): Promise<void> {
  await portfolioChanges.insert(test.db, {
    userId,
    shareId,
    quantityDelta: "3",
    effectiveAt: new Date("2026-01-05T10:00:00Z"),
    createdBy: userId,
  });
}

function idsOf(groups: AdminShareGroups) {
  return Object.fromEntries(
    Object.entries(groups).map(([group, list]) => [
      group,
      list.map(({ id }) => id),
    ]),
  );
}

describe("GET /api/admin/shares", () => {
  it("puts every stored share in one group, with its holders and latest price", async () => {
    const admin = await addSignedIn(server, test.db, auth, "admin");
    const member = await addSignedIn(server, test.db, auth, "member");
    const [unpriced, priced, manual, notHeld] = [
      await addShare(test.db, "market"),
      await addShare(test.db, "market"),
      await addShare(test.db, "manual"),
      await addShare(test.db, "market"),
    ];
    await hold(member.id, unpriced.id);
    await hold(member.id, priced.id);
    const closeAt = new Date(Date.now() - 60_000);
    await priceRows.upsert(test.db, {
      shareId: priced.id,
      at: closeAt,
      priceEur: "74.328",
      source: "close",
      enteredBy: null,
    });

    const response = await apiRequest(server, "/admin/shares", {
      cookie: admin.cookie,
    });

    expect(response.status).toBe(200);
    const groups = parseOutput(listShares, await response.json());
    expect(idsOf(groups)).toEqual({
      needsAttention: [unpriced.id],
      tracked: [priced.id],
      manual: [manual.id],
      notHeld: [notHeld.id],
    });
    expect(groups.tracked[0]).toMatchObject({
      symbol: priced.providerSymbol,
      exchange: "PA",
      addedAt: priced.createdAt.toISOString(),
      latestPrice: {
        at: closeAt.toISOString(),
        priceEur: "74.328",
        source: "close",
      },
      holders: [{ id: member.id, displayName: "Test member" }],
      hasShareChanges: true,
    });
    expect(groups.needsAttention[0]?.latestPrice).toBeNull();
    expect(groups.manual[0]).toMatchObject({
      exchange: null,
      holders: [],
      hasShareChanges: false,
    });
  });

  it("lets an anonymous viewer read it, with pseudonyms for holders", async () => {
    const member = await addSignedIn(server, test.db, auth, "member");
    const viewer = await addSignedIn(server, test.db, auth, "anonymous");
    const share = await addShare(test.db, "market");
    await hold(member.id, share.id);

    const response = await apiRequest(server, "/admin/shares", {
      cookie: viewer.cookie,
    });

    expect(response.status).toBe(200);
    const groups = parseOutput(listShares, await response.json());
    const listed = groups.needsAttention.find(({ id }) => id === share.id);
    expect(listed?.holders).toEqual([
      expect.objectContaining({
        id: member.id,
        displayName: await pseudonymOf(test.db, member.id),
        avatarUrl: null,
      }),
    ]);
  });

  it("refuses members and guests", async () => {
    for (const role of ["member", "guest"] as const) {
      const viewer = await addSignedIn(server, test.db, auth, role);
      await expectError(
        listShares,
        await apiRequest(server, "/admin/shares", { cookie: viewer.cookie }),
        "forbidden",
      );
    }
  });
});

describe("POST /api/admin/shares/:id/make-manual", () => {
  const post = (cookie: string, id: string, body: Record<string, unknown>) =>
    apiRequest(server, `/admin/shares/${id}/make-manual`, {
      method: "POST",
      cookie,
      body,
    });

  it("makes a share with no price manual, from the value the admin gives", async () => {
    const admin = await addSignedIn(server, test.db, auth, "admin");
    const member = await addSignedIn(server, test.db, auth, "member");
    const share = await addShare(test.db, "market");
    await hold(member.id, share.id);
    const body = { priceEur: "12.50", at: "2026-03-02T16:30:00.000Z" };
    prices.routes.makeManual = async (input) => {
      const made = await shares.update(test.db, input.id, {
        kind: "manual",
        providerSymbol: null,
        exchange: null,
        tradingCurrency: null,
      });
      return { ...share, ...made, symbol: null };
    };

    const response = await post(admin.cookie, share.id, body);

    expect(response.status).toBe(200);
    expect(parseOutput(makeManual, await response.json())).toMatchObject({
      id: share.id,
      kind: "manual",
      holders: [{ id: member.id }],
    });
    expect(prices.requests[0]).toMatchObject({
      path: `/shares/${share.id}/make-manual`,
      body: { ...body, enteredBy: admin.id },
    });
  });

  it("forwards share_not_needing_attention, and refuses everyone but the admin", async () => {
    const admin = await addSignedIn(server, test.db, auth, "admin");
    const share = await addShare(test.db, "market");
    prices.routes.makeManual = async () => {
      throw apiError("share_not_needing_attention");
    };

    await expectError(
      makeManual,
      await post(admin.cookie, share.id, {}),
      "share_not_needing_attention",
    );
    for (const role of ["member", "guest", "anonymous"] as const) {
      const viewer = await addSignedIn(server, test.db, auth, role);
      await expectError(
        makeManual,
        await post(viewer.cookie, share.id, {}),
        "forbidden",
      );
    }
  });
});

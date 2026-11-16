import { randomUUID } from "node:crypto";
import { apiContract, type PortfolioChange } from "@fpr/contracts";
import { portfolioChanges, type Share } from "@fpr/db";
import { createTestDatabase, type TestDatabase } from "@fpr/db/testing";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Auth } from "../../src/auth/auth.js";
import { apiError } from "../../src/errors.js";
import {
  createSeriesCache,
  type SeriesCache,
} from "../../src/valuation/series-cache.js";
import { expectError } from "../access-support.js";
import {
  addShare,
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
let series: SeriesCache;

beforeAll(async () => {
  test = await createTestDatabase();
  auth = createTestAuth(test.db);
  prices = createTestPrices();
  series = createSeriesCache({ db: test.db, timeZone: TEST_RACE_TIMEZONE });
  server = await serveApp({
    db: test.db,
    auth,
    prices: prices.prices,
    series,
  });
});

afterAll(async () => {
  await server.close();
  await test.drop();
});

const signedIn = (role: "admin" | "member" | "guest") =>
  addSignedIn(server, test.db, auth, role);

const { addChange, updateChange, deleteChange } = apiContract.portfolio;

function post(
  cookie: string,
  userId: string,
  body: Record<string, unknown>,
): Promise<Response> {
  return apiRequest(server, `/users/${userId}/changes`, {
    method: "POST",
    cookie,
    body,
  });
}

async function record(
  person: { id: string; cookie: string },
  share: Share,
  quantityDelta: string,
  effectiveAt: string,
): Promise<PortfolioChange> {
  const response = await post(person.cookie, person.id, {
    shareId: share.id,
    quantityDelta,
    effectiveAt,
  });
  expect(response.status).toBe(201);
  return parseOutput(addChange, await response.json());
}

describe("POST /api/users/:userId/changes", () => {
  it("records a change as entered, made by the member, and clears the series", async () => {
    const member = await signedIn("member");
    const share = await addShare(test.db);
    expect((await series.get()).members.has(member.id)).toBe(false);

    const change = await record(
      member,
      share,
      "74.328",
      "2026-03-02T17:30:00+01:00",
    );

    expect(change).toMatchObject({
      type: "change",
      share: { id: share.id, isin: share.isin, symbol: share.providerSymbol },
      quantityDelta: "74.328",
      effectiveAt: "2026-03-02T16:30:00.000Z",
      madeBy: { id: member.id, displayName: "Test member" },
    });
    expect((await series.get()).members.has(member.id)).toBe(true);
  });

  it("records the admin as who made a change for a member", async () => {
    const [admin, member] = [await signedIn("admin"), await signedIn("member")];
    const share = await addShare(test.db);

    const response = await post(admin.cookie, member.id, {
      shareId: share.id,
      quantityDelta: "2",
      effectiveAt: "2026-03-02T10:00:00Z",
    });

    expect(response.status).toBe(201);
    expect(parseOutput(addChange, await response.json()).madeBy).toEqual({
      id: admin.id,
      displayName: "Test admin",
    });
  });

  it("refuses another member's portfolio, a guest's, a future moment, and zero", async () => {
    const [admin, member, other, guest] = [
      await signedIn("admin"),
      await signedIn("member"),
      await signedIn("member"),
      await signedIn("guest"),
    ];
    const share = await addShare(test.db);
    const body = {
      shareId: share.id,
      quantityDelta: "1",
      effectiveAt: "2026-03-02T10:00:00Z",
    };

    await expectError(
      addChange,
      await post(member.cookie, other.id, body),
      "forbidden",
    );
    await expectError(
      addChange,
      await post(admin.cookie, guest.id, body),
      "not_found",
    );
    await expectError(
      addChange,
      await post(member.cookie, member.id, {
        ...body,
        effectiveAt: new Date(Date.now() + 60_000).toISOString(),
      }),
      "future_moment",
    );
    const zero = await post(member.cookie, member.id, {
      ...body,
      quantityDelta: "0.000",
    });
    expect(zero.status).toBe(400);
  });

  it("refuses a moment before 2000 and a quantity with more digits than a person enters", async () => {
    const member = await signedIn("member");
    const share = await addShare(test.db);
    const body = {
      shareId: share.id,
      quantityDelta: "1",
      effectiveAt: "2026-03-02T10:00:00Z",
    };

    for (const sent of [
      { effectiveAt: "1999-12-31T23:59:59Z" },
      { quantityDelta: "1".repeat(13) },
      { quantityDelta: "1.123456789" },
    ]) {
      await expectError(
        addChange,
        await post(member.cookie, member.id, { ...body, ...sent }),
        "invalid_request",
        { issues: [{ path: Object.keys(sent), code: "custom" }] },
      );
    }
    await record(
      member,
      share,
      "999999999999.12345678",
      "2000-01-01T00:00:00Z",
    );
  });

  it("saves a change sent twice with its id once, and refuses another member's id", async () => {
    const [member, other] = [
      await signedIn("member"),
      await signedIn("member"),
    ];
    const share = await addShare(test.db);
    const body = {
      id: randomUUID(),
      shareId: share.id,
      quantityDelta: "3",
      effectiveAt: "2026-03-02T10:00:00Z",
    };

    const [first, second] = await Promise.all([
      post(member.cookie, member.id, body),
      post(member.cookie, member.id, body),
    ]);

    expect([first.status, second.status]).toEqual([201, 201]);
    expect(await second.json()).toEqual(await first.json());
    const stored = await test.db
      .selectFrom("portfolioChanges")
      .select("id")
      .where("userId", "=", member.id)
      .execute();
    expect(stored).toEqual([{ id: body.id }]);
    await expectError(
      addChange,
      await post(other.cookie, other.id, body),
      "forbidden",
    );
  });

  it("refuses a sale below what was held, naming the change sent", async () => {
    const member = await signedIn("member");
    const share = await addShare(test.db);
    await record(member, share, "5", "2026-03-02T10:00:00Z");

    const response = await post(member.cookie, member.id, {
      shareId: share.id,
      quantityDelta: "-6",
      effectiveAt: "2026-03-03T10:00:00Z",
    });

    await expectError(addChange, response, "holding_below_zero", {
      change: null,
      held: "5",
    });
  });

  it("lets one of two simultaneous removals through when the holding covers one", async () => {
    const member = await signedIn("member");
    const share = await addShare(test.db);
    await record(member, share, "10", "2026-03-02T10:00:00Z");
    const sale = {
      shareId: share.id,
      quantityDelta: "-7",
      effectiveAt: "2026-03-03T10:00:00Z",
    };

    const responses = await Promise.all([
      post(member.cookie, member.id, sale),
      post(member.cookie, member.id, sale),
    ]);

    expect(responses.map(({ status }) => status).toSorted()).toEqual([
      201, 422,
    ]);
    expect(
      await portfolioChanges.holdingAt(
        test.db,
        member.id,
        share.id,
        new Date(),
      ),
    ).toBe("3");
  });

  it("asks for the history of a market share's first holding, without waiting", async () => {
    const member = await signedIn("member");
    const [market, manual] = [
      await addShare(test.db),
      await addShare(test.db, "manual"),
    ];
    prices.requests.length = 0;

    await record(member, market, "1", "2026-03-02T23:30:00Z");
    await record(member, manual, "1", "2026-03-02T23:30:00Z");

    await expect
      .poll(() => prices.requests)
      .toEqual([
        {
          method: "POST",
          path: `/shares/${market.id}/history`,
          // 00:30 on 3 March in Paris.
          body: { from: "2026-03-03" },
        },
      ]);
  });

  it("saves the change when the history request fails, and logs the failure", async () => {
    const member = await signedIn("member");
    const market = await addShare(test.db);
    prices.routes.fillHistory = async () => {
      throw apiError("call_budget_used");
    };
    try {
      await record(member, market, "1", "2026-03-02T10:00:00Z");

      await expect
        .poll(() =>
          server
            .lines()
            .some(
              (line) =>
                line.message === "price history request failed" &&
                line.shareId === market.id,
            ),
        )
        .toBe(true);
    } finally {
      prices.reset();
    }
  });

  it("asks for nothing once the share has closes in the week up to the change", async () => {
    const member = await signedIn("member");
    const share = await addShare(test.db);
    await test.db
      .insertInto("prices")
      .values({
        shareId: share.id,
        at: new Date("2026-03-02T22:59:59Z"),
        priceEur: "10",
        source: "close",
      })
      .execute();
    prices.requests.length = 0;

    await record(member, share, "1", "2026-03-04T10:00:00Z");

    expect(prices.requests).toEqual([]);
  });
});

describe("PATCH and DELETE /api/changes/:id", () => {
  async function holdingWithSale() {
    const member = await signedIn("member");
    const share = await addShare(test.db);
    const purchase = await record(member, share, "5", "2026-03-02T10:00:00Z");
    const sale = await record(member, share, "-4", "2026-03-05T10:00:00Z");
    return { member, purchase, sale };
  }

  it("refuses an edit or a deletion that breaks a later sale, naming it", async () => {
    const { member, purchase, sale } = await holdingWithSale();

    const edit = await apiRequest(server, `/changes/${purchase.id}`, {
      method: "PATCH",
      cookie: member.cookie,
      body: { quantityDelta: "3" },
    });
    await expectError(updateChange, edit, "holding_below_zero", {
      change: sale,
      held: "3",
    });

    const removal = await apiRequest(server, `/changes/${purchase.id}`, {
      method: "DELETE",
      cookie: member.cookie,
    });
    await expectError(deleteChange, removal, "holding_below_zero", {
      change: sale,
      held: "0",
    });
  });

  it("edits and deletes a member's own change, or any change for the admin", async () => {
    const { member, purchase, sale } = await holdingWithSale();
    const [other, admin] = [await signedIn("member"), await signedIn("admin")];

    const refused = await apiRequest(server, `/changes/${sale.id}`, {
      method: "PATCH",
      cookie: other.cookie,
      body: { quantityDelta: "-1" },
    });
    await expectError(updateChange, refused, "forbidden");

    const edit = await apiRequest(server, `/changes/${sale.id}`, {
      method: "PATCH",
      cookie: admin.cookie,
      body: { quantityDelta: "-5", effectiveAt: "2026-03-06T10:00:00Z" },
    });
    expect(edit.status).toBe(200);
    expect(parseOutput(updateChange, await edit.json())).toEqual({
      ...sale,
      quantityDelta: "-5",
      effectiveAt: "2026-03-06T10:00:00.000Z",
    });

    for (const id of [sale.id, purchase.id]) {
      const removal = await apiRequest(server, `/changes/${id}`, {
        method: "DELETE",
        cookie: member.cookie,
      });
      expect(removal.status).toBe(204);
    }
    const gone = await apiRequest(server, `/changes/${sale.id}`, {
      method: "DELETE",
      cookie: member.cookie,
    });
    await expectError(deleteChange, gone, "not_found");
  });
});

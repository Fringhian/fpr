import { users } from "@fpr/db";
import { createTestDatabase, type TestDatabase } from "@fpr/db/testing";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  createSeriesCache,
  type SeriesCache,
} from "../src/valuation/series-cache.js";
import { TEST_RACE_TIMEZONE } from "./test-support.js";

let test: TestDatabase;
let cache: SeriesCache;
let now = new Date("2026-11-11T12:00:00+01:00");
let userId: string;
let shareId: string;

beforeAll(async () => {
  test = await createTestDatabase();
  cache = createSeriesCache({
    db: test.db,
    timeZone: TEST_RACE_TIMEZONE,
    now: () => now,
  });
  const user = await users.insert(test.db, {
    email: "robin@example.com",
    displayName: "Robin",
    role: "member",
    color: 1,
    avatarKey: null,
    locale: null,
    onboardedAt: null,
  });
  userId = user.id;
  const share = await test.db
    .insertInto("shares")
    .values({
      isin: "FR0000000001",
      name: "Example Share",
      kind: "market",
      tradingCurrency: "EUR",
      providerSymbol: "EXA.PA",
      exchange: "PA",
      historyStartsOn: null,
      createdBy: null,
    })
    .returning("id")
    .executeTakeFirstOrThrow();
  shareId = share.id;
  await test.db
    .insertInto("portfolioChanges")
    .values({
      userId,
      shareId,
      quantityDelta: "2",
      effectiveAt: new Date("2026-11-09T10:00:00+01:00"),
      createdBy: userId,
    })
    .execute();
});

afterAll(async () => {
  await test.drop();
});

const pointsOf = async () => (await cache.get()).members.get(userId) ?? [];

describe("the series cache", () => {
  it("answers the same series until something changes", async () => {
    const first = await cache.get();

    expect(await cache.get()).toBe(first);
  });

  it("recomputes after a write the API clears it for", async () => {
    const before = await cache.get();
    await test.db
      .insertInto("cashBalances")
      .values({
        userId,
        amountEur: "40",
        effectiveAt: new Date("2026-11-09T11:00:00+01:00"),
        createdBy: userId,
      })
      .execute();

    expect(await cache.get()).toBe(before);
    cache.clear();

    const after = await cache.get();
    expect(after).not.toBe(before);
    expect((await pointsOf())[0]?.cashEur).toBe("40");
  });

  it("recomputes when the price service has written a price", async () => {
    const before = await cache.get();
    expect((await pointsOf())[0]?.incomplete).toBe(true);

    await test.db
      .insertInto("prices")
      .values({
        shareId,
        at: new Date("2026-11-09T23:59:59+01:00"),
        priceEur: "15",
        source: "close",
      })
      .execute();

    expect(await cache.get()).not.toBe(before);
    expect((await pointsOf())[0]).toMatchObject({
      balanceEur: "70",
      incomplete: false,
    });
  });

  it("recomputes once a new close has passed", async () => {
    const before = await cache.get();
    expect((await pointsOf()).at(-1)?.at).toEqual(
      new Date("2026-11-10T23:59:59+01:00"),
    );

    now = new Date("2026-11-12T08:00:00+01:00");

    expect(await cache.get()).not.toBe(before);
    expect((await pointsOf()).at(-1)?.at).toEqual(
      new Date("2026-11-11T23:59:59+01:00"),
    );
  });
});

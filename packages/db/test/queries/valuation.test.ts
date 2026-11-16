import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Db } from "../../src/database.js";
import { insert as insertUser } from "../../src/queries/users.js";
import {
  balanceSeries,
  balancesAt,
  lastCloseAt,
} from "../../src/queries/valuation.js";
import type { NewShare } from "../../src/tables/share.js";
import { createTestDatabase, type TestDatabase } from "../../src/testing.js";

/**
 * One week in Paris, November 2026 (UTC+1): Thursday 5 to Wednesday 11, with
 * Monday 9 a holiday with no close, and two intraday refreshes on Wednesday
 * morning. "Now" is Wednesday noon, so the last close is Tuesday's.
 */
const clock = {
  now: new Date("2026-11-11T12:00:00+01:00"),
  timeZone: "Europe/Paris",
};
const close = (day: string) => new Date(`${day}T23:59:59+01:00`);
const moment = (iso: string) => new Date(`${iso}+01:00`);

let test: TestDatabase;
let db: Db;
const people: Record<"alex" | "sam" | "kim", string> = {
  alex: "",
  sam: "",
  kim: "",
};
const shares: Record<"market" | "pending" | "manual" | "late", string> = {
  market: "",
  pending: "",
  manual: "",
  late: "",
};

const marketShare = (isin: string, symbol: string): NewShare => ({
  isin,
  name: `Example ${symbol}`,
  kind: "market",
  tradingCurrency: "EUR",
  providerSymbol: symbol,
  exchange: "PA",
  historyStartsOn: null,
  createdBy: null,
});

async function addPeople(): Promise<void> {
  for (const [index, key] of (["alex", "sam", "kim"] as const).entries()) {
    const user = await insertUser(db, {
      email: `${key}@example.com`,
      displayName: key,
      role: "member",
      color: index + 1,
      avatarKey: null,
      locale: null,
      onboardedAt: null,
    });
    people[key] = user.id;
  }
}

async function addShares(): Promise<void> {
  const rows = await db
    .insertInto("shares")
    .values([
      marketShare("FR0000000001", "MKT.PA"),
      marketShare("FR0000000002", "PND.PA"),
      {
        ...marketShare("FR0000000003", "MAN.PA"),
        kind: "manual",
        tradingCurrency: null,
        providerSymbol: null,
        exchange: null,
      },
      {
        ...marketShare("FR0000000004", "LTE.PA"),
        historyStartsOn: "2026-11-06",
      },
    ])
    .returning("id")
    .execute();
  const ids = rows.map(({ id }) => id);
  for (const [index, key] of (
    ["market", "pending", "manual", "late"] as const
  ).entries()) {
    shares[key] = ids[index] ?? "";
  }
}

async function addPrices(): Promise<void> {
  const written = moment("2026-11-11T07:00:00");
  await db
    .insertInto("prices")
    .values([
      {
        shareId: shares.market,
        at: close("2026-11-05"),
        priceEur: "10",
        source: "close",
        createdAt: written,
      },
      {
        shareId: shares.market,
        at: close("2026-11-06"),
        priceEur: "11",
        source: "close",
        createdAt: written,
      },
      {
        shareId: shares.market,
        at: close("2026-11-10"),
        priceEur: "12",
        source: "close",
        createdAt: written,
      },
      {
        shareId: shares.late,
        at: close("2026-11-06"),
        priceEur: "20",
        source: "close",
        createdAt: written,
      },
      {
        shareId: shares.late,
        at: close("2026-11-10"),
        priceEur: "21",
        source: "close",
        createdAt: written,
      },
      {
        shareId: shares.manual,
        at: moment("2026-11-06T09:00:00"),
        priceEur: "50",
        source: "manual",
        createdAt: written,
      },
      // The first refresh writes two prices a few seconds apart, the second one.
      {
        shareId: shares.late,
        at: moment("2026-11-11T09:45:00"),
        priceEur: "21",
        source: "intraday",
        createdAt: moment("2026-11-11T10:00:02"),
      },
      {
        shareId: shares.market,
        at: moment("2026-11-11T09:45:00"),
        priceEur: "12.5",
        source: "intraday",
        createdAt: moment("2026-11-11T10:00:05"),
      },
      {
        shareId: shares.market,
        at: moment("2026-11-11T10:15:00"),
        priceEur: "12.6",
        source: "intraday",
        createdAt: moment("2026-11-11T10:30:04"),
      },
    ])
    .execute();
}

async function addEntries(): Promise<void> {
  const change = (
    user: string,
    share: string,
    quantityDelta: string,
    at: string,
  ) => ({
    userId: user,
    shareId: share,
    quantityDelta,
    effectiveAt: moment(at),
    createdBy: user,
  });
  await db
    .insertInto("portfolioChanges")
    .values([
      change(people.alex, shares.market, "10", "2026-11-05T10:00:00"),
      change(people.alex, shares.market, "-4", "2026-11-10T15:00:00"),
      change(people.sam, shares.pending, "5", "2026-11-05T11:00:00"),
      change(people.sam, shares.manual, "2", "2026-11-05T11:00:00"),
      change(people.sam, shares.late, "1", "2026-11-05T11:00:00"),
    ])
    .execute();
  const cash = (
    user: string,
    amountEur: string,
    at: string,
    recorded: string,
  ) => ({
    userId: user,
    amountEur,
    effectiveAt: moment(at),
    createdBy: user,
    createdAt: moment(recorded),
  });
  await db
    .insertInto("cashBalances")
    .values([
      // Two balances at the same moment: the one recorded last counts.
      cash(people.alex, "100", "2026-11-06T12:00:00", "2026-11-06T12:01:00"),
      cash(people.alex, "150", "2026-11-06T12:00:00", "2026-11-06T12:02:00"),
      cash(people.kim, "30", "2026-11-07T10:00:00", "2026-11-07T10:00:00"),
    ])
    .execute();
}

beforeAll(async () => {
  test = await createTestDatabase();
  db = test.db;
  await addPeople();
  await addShares();
  await addPrices();
  await addEntries();
});

afterAll(async () => {
  await test.drop();
});

/** A member's series, with each balance as a number for comparison. */
async function pointsOf(userId: string) {
  const series = await balanceSeries(db, clock);
  return (series.members.get(userId) ?? []).map((point) => ({
    at: point.at.toISOString(),
    balance: Number(point.balanceEur),
    provisional: point.provisional,
    incomplete: point.incomplete,
  }));
}

const closePoint = (day: string, balance: number, incomplete = false) => ({
  at: close(day).toISOString(),
  balance,
  provisional: false,
  incomplete,
});

const refreshPoint = (iso: string, balance: number) => ({
  at: moment(iso).toISOString(),
  balance,
  provisional: true,
  incomplete: false,
});

describe("balanceSeries", () => {
  it("ends at Tuesday's close, the latest weekday that has ended", async () => {
    expect(await lastCloseAt(db, clock)).toEqual(close("2026-11-10"));
    expect(
      await lastCloseAt(db, { ...clock, now: moment("2026-11-08T12:00:00") }),
    ).toEqual(close("2026-11-06"));
  });

  it("values buys, a sale and cash at each weekday's close, then each refresh", async () => {
    expect(await pointsOf(people.alex)).toEqual([
      closePoint("2026-11-05", 100),
      // 10 × 11, plus the cash recorded last at that moment.
      closePoint("2026-11-06", 260),
      // A holiday: no close, so the share keeps Friday's.
      closePoint("2026-11-09", 260),
      // Sold 4 that day: 6 × 12 + 150.
      closePoint("2026-11-10", 222),
      refreshPoint("2026-11-11T10:00:05", 225),
      refreshPoint("2026-11-11T10:30:04", 225.6),
    ]);
  });

  it("carries the flows up to each moment: share changes at their day's close, plus cash", async () => {
    const series = await balanceSeries(db, clock);
    const flows = (userId: string) =>
      (series.members.get(userId) ?? []).map(({ flowsEur }) =>
        Number(flowsEur),
      );

    // Bought 10 at 10, cash set to 150, sold 4 at Tuesday's 12.
    expect(flows(people.alex)).toEqual([100, 250, 250, 202, 202, 202]);
    // The pending share counts as zero, as the balance leaves it out.
    expect(flows(people.sam)[0]).toBe(120);
  });

  it("leaves out a pending share, and values a manual or late share at its earliest price before it", async () => {
    const points = await pointsOf(people.sam);

    // 2 × 50 for the manual share and 1 × 20 for the late one; the pending
    // share is left out.
    expect(points[0]).toEqual(closePoint("2026-11-05", 120, true));
    expect(points[3]).toEqual(closePoint("2026-11-10", 121, true));
    expect(points.every(({ incomplete }) => incomplete)).toBe(true);
  });

  it("starts a member whose first entry is on a weekend at the next close", async () => {
    expect(await pointsOf(people.kim)).toEqual([
      closePoint("2026-11-09", 30),
      closePoint("2026-11-10", 30),
      refreshPoint("2026-11-11T10:00:05", 30),
      refreshPoint("2026-11-11T10:30:04", 30),
    ]);
  });

  it("follows an entry moved into the past", async () => {
    await db
      .updateTable("portfolioChanges")
      .set({ effectiveAt: moment("2026-11-04T10:00:00") })
      .where("userId", "=", people.alex)
      .where("quantityDelta", "=", "10")
      .execute();

    const points = await pointsOf(people.alex);

    // No price before Thursday's close: Wednesday's balance is incomplete.
    expect(points[0]).toEqual(closePoint("2026-11-04", 0, true));
    expect(points[1]).toEqual(closePoint("2026-11-05", 100));
  });
});

describe("balancesAt", () => {
  it("values every member with an entry at a moment", async () => {
    const balances = await balancesAt(db, {
      at: clock.now,
      timeZone: clock.timeZone,
    });

    expect(Number(balances.get(people.alex)?.balanceEur)).toBe(225.6);
    expect(balances.get(people.sam)).toMatchObject({ incomplete: true });
    expect(balances.get(people.kim)).toMatchObject({
      cashEur: "30",
      sharesEur: "0",
      incomplete: false,
    });
  });
});

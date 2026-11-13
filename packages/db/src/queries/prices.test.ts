import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
} from "vitest";
import type { Db } from "../database.js";
import type { NewPrice } from "../tables/price.js";
import { createTestDatabase, type TestDatabase } from "../testing.js";
import {
  deleteIntradayBefore,
  find,
  latestAt,
  listBetween,
  remove,
  upsert,
} from "./prices.js";

let test: TestDatabase;
let db: Db;
let shareId: string;
let otherShareId: string;

beforeAll(async () => {
  test = await createTestDatabase();
  db = test.db;
});

afterAll(async () => {
  await test.drop();
});

beforeEach(async () => {
  const [share, other] = await db
    .insertInto("shares")
    .values([
      {
        isin: "US0000000001",
        name: "Example Corp",
        kind: "market",
        tradingCurrency: "USD",
        providerSymbol: "EXC.US",
        exchange: "US",
        historyStartsOn: null,
        createdBy: null,
      },
      {
        isin: "FR0000000002",
        name: "Example Fund",
        kind: "manual",
        tradingCurrency: null,
        providerSymbol: null,
        exchange: null,
        historyStartsOn: null,
        createdBy: null,
      },
    ])
    .returning("id")
    .execute();
  shareId = share?.id ?? "";
  otherShareId = other?.id ?? "";
});

afterEach(async () => {
  await db.deleteFrom("shares").execute();
  await db.deleteFrom("user").execute();
});

const at = (iso: string) => new Date(iso);

const price = (changes: Partial<NewPrice> = {}): NewPrice => ({
  shareId,
  at: at("2026-03-02T22:59:59Z"),
  priceEur: "40.10",
  source: "close",
  enteredBy: null,
  ...changes,
});

/** Closes on 2 and 3 March, and intraday prices on 3 and 4 March. */
async function seedPrices(): Promise<void> {
  for (const row of [
    price({ at: at("2026-03-02T22:59:59Z"), priceEur: "40" }),
    price({
      at: at("2026-03-03T10:00:00Z"),
      priceEur: "41",
      source: "intraday",
    }),
    price({ at: at("2026-03-03T22:59:59Z"), priceEur: "42" }),
    price({
      at: at("2026-03-04T10:00:00Z"),
      priceEur: "43",
      source: "intraday",
    }),
    price({
      shareId: otherShareId,
      at: at("2026-03-04T09:00:00Z"),
      priceEur: "99",
      source: "manual",
    }),
  ]) {
    await upsert(db, row);
  }
}

describe("upsert", () => {
  it("stores a price and returns its row", async () => {
    const row = await upsert(db, price());
    expect(row).toMatchObject(price());
    expect(row.createdAt).toBeInstanceOf(Date);
  });

  it("replaces the price, source, and entered_by at the same moment", async () => {
    const person = await db
      .insertInto("user")
      .values({
        email: "alex@example.com",
        displayName: "Alex",
        avatarKey: null,
        role: "member",
        color: 1,
        locale: null,
        onboardedAt: null,
      })
      .returning("id")
      .executeTakeFirstOrThrow();
    const first = await upsert(db, price());
    const second = await upsert(
      db,
      price({
        at: at("2026-03-02T23:59:59+01:00"),
        priceEur: "39.95",
        source: "manual",
        enteredBy: person.id,
      }),
    );
    expect(second).toEqual({
      ...first,
      priceEur: "39.95",
      source: "manual",
      enteredBy: person.id,
    });
    expect(
      await listBetween(db, shareId, at("2026-01-01"), at("2027-01-01")),
    ).toHaveLength(1);
  });
});

describe("find", () => {
  it("finds the price at exactly a moment, in any offset", async () => {
    await seedPrices();
    expect(
      await find(db, shareId, at("2026-03-03T11:00:00+01:00")),
    ).toMatchObject({ priceEur: "41", source: "intraday" });
    expect(await find(db, shareId, at("2026-03-03T10:00:01Z"))).toBeUndefined();
  });
});

describe("latestAt", () => {
  it("is the latest price at or before a moment", async () => {
    await seedPrices();
    expect(
      await latestAt(db, shareId, at("2026-03-03T10:00:00Z")),
    ).toMatchObject({ priceEur: "41", at: at("2026-03-03T10:00:00Z") });
    expect(
      await latestAt(db, shareId, at("2026-03-03T20:00:00Z")),
    ).toMatchObject({ priceEur: "41" });
    expect(
      await latestAt(db, shareId, at("2026-03-10T00:00:00Z")),
    ).toMatchObject({ priceEur: "43" });
  });

  it("is nothing before the share's first price", async () => {
    await seedPrices();
    expect(
      await latestAt(db, shareId, at("2026-03-02T22:59:58Z")),
    ).toBeUndefined();
  });

  it("counts only the given sources", async () => {
    await seedPrices();
    expect(
      await latestAt(db, shareId, at("2026-03-10T00:00:00Z"), ["close"]),
    ).toMatchObject({ priceEur: "42", source: "close" });
    expect(
      await latestAt(db, shareId, at("2026-03-03T12:00:00Z"), [
        "close",
        "manual",
      ]),
    ).toMatchObject({ priceEur: "40" });
    expect(
      await latestAt(db, shareId, at("2026-03-10T00:00:00Z"), ["manual"]),
    ).toBeUndefined();
  });

  it("reads one share's prices only", async () => {
    await seedPrices();
    expect(
      await latestAt(db, otherShareId, at("2026-03-10T00:00:00Z")),
    ).toMatchObject({ priceEur: "99", source: "manual" });
  });
});

describe("listBetween", () => {
  it("lists a share's prices between two moments, both included, oldest first", async () => {
    await seedPrices();
    const rows = await listBetween(
      db,
      shareId,
      at("2026-03-02T22:59:59Z"),
      at("2026-03-04T10:00:00Z"),
    );
    expect(rows.map((row) => row.priceEur)).toEqual(["40", "41", "42", "43"]);
    const inner = await listBetween(
      db,
      shareId,
      at("2026-03-03T00:00:00Z"),
      at("2026-03-04T00:00:00Z"),
    );
    expect(inner.map((row) => row.priceEur)).toEqual(["41", "42"]);
  });

  it("lists only the given sources", async () => {
    await seedPrices();
    const rows = await listBetween(
      db,
      shareId,
      at("2026-03-01T00:00:00Z"),
      at("2026-03-10T00:00:00Z"),
      ["intraday"],
    );
    expect(rows.map((row) => row.priceEur)).toEqual(["41", "43"]);
  });
});

describe("remove", () => {
  it("deletes the price at a moment, and reports whether one was there", async () => {
    await seedPrices();
    const moment = at("2026-03-03T22:59:59Z");
    expect(await remove(db, shareId, moment)).toBe(true);
    expect(await find(db, shareId, moment)).toBeUndefined();
    expect(await remove(db, shareId, moment)).toBe(false);
    expect(
      await listBetween(db, shareId, at("2026-03-01"), at("2026-03-10")),
    ).toHaveLength(3);
  });
});

describe("deleteIntradayBefore", () => {
  it("deletes every share's intraday prices before a moment, and counts them", async () => {
    await seedPrices();
    await upsert(
      db,
      price({
        shareId: otherShareId,
        at: at("2026-03-03T09:00:00Z"),
        source: "intraday",
      }),
    );
    expect(await deleteIntradayBefore(db, at("2026-03-04T10:00:00Z"))).toBe(2);
    const left = await db
      .selectFrom("prices")
      .select(["priceEur", "source"])
      .orderBy("at")
      .execute();
    expect(left).toEqual([
      { priceEur: "40", source: "close" },
      { priceEur: "42", source: "close" },
      { priceEur: "99", source: "manual" },
      { priceEur: "43", source: "intraday" },
    ]);
    expect(await deleteIntradayBefore(db, at("2026-03-04T10:00:00Z"))).toBe(0);
  });
});

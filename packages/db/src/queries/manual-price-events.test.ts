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
import type { NewManualPriceEvent } from "../tables/manual-price-event.js";
import { createTestDatabase, type TestDatabase } from "../testing.js";
import { insert, listByShare } from "./manual-price-events.js";

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
    .values(
      ["FR0000000001", "FR0000000002"].map((isin) => ({
        isin,
        name: "Example Fund",
        kind: "manual" as const,
        tradingCurrency: null,
        providerSymbol: null,
        exchange: null,
        historyStartsOn: null,
        createdBy: null,
      })),
    )
    .returning("id")
    .execute();
  shareId = share?.id ?? "";
  otherShareId = other?.id ?? "";
});

afterEach(async () => {
  await db.deleteFrom("shares").execute();
  await db.deleteFrom("user").execute();
});

const AT = new Date("2026-03-03T04:10:00Z");

const event = (
  changes: Partial<NewManualPriceEvent> = {},
): NewManualPriceEvent => ({
  shareId,
  at: AT,
  action: "added",
  priceEur: "41.00",
  previousPriceEur: null,
  userId: null,
  ...changes,
});

describe("insert", () => {
  it("records a value edit and returns its row", async () => {
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
    const row = await insert(
      db,
      event({
        action: "edited",
        priceEur: "40.10",
        previousPriceEur: "41.00",
        userId: person.id,
      }),
    );
    expect(row).toMatchObject({
      shareId,
      at: AT,
      action: "edited",
      priceEur: "40.10",
      previousPriceEur: "41.00",
      userId: person.id,
    });
    expect(row.createdAt).toBeInstanceOf(Date);
  });
});

describe("listByShare", () => {
  it("lists a share's value edits, newest first", async () => {
    await insert(db, event());
    await insert(
      db,
      event({ action: "edited", priceEur: "40.10", previousPriceEur: "41.00" }),
    );
    await insert(
      db,
      event({
        at: new Date("2026-03-01T04:10:00Z"),
        action: "deleted",
        priceEur: null,
        previousPriceEur: "39.00",
      }),
    );
    await insert(db, event({ shareId: otherShareId }));

    const rows = await listByShare(db, shareId);
    expect(rows.map((row) => row.action)).toEqual([
      "deleted",
      "edited",
      "added",
    ]);
  });

  it("is empty for a share with no value edits", async () => {
    expect(await listByShare(db, shareId)).toEqual([]);
  });
});

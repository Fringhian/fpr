import { sql } from "kysely";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import type { Db } from "../database.js";
import type { NewCashBalance } from "../tables/cash-balance.js";
import type { NewPortfolioChange } from "../tables/portfolio-change.js";
import { createTestDatabase, type TestDatabase } from "../testing.js";

let test: TestDatabase;
let db: Db;

beforeAll(async () => {
  test = await createTestDatabase();
  db = test.db;
});

afterAll(async () => {
  await test.drop();
});

afterEach(async () => {
  await db.deleteFrom("user").execute();
  await db.deleteFrom("shares").execute();
});

const UUID_V7 =
  /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const AT = new Date("2026-03-02T16:30:00Z");

let colors = 0;
const insertPerson = async (): Promise<string> => {
  colors += 1;
  const row = await db
    .insertInto("user")
    .values({
      email: `person${colors}@example.com`,
      displayName: `Person ${colors}`,
      avatarKey: null,
      role: "member",
      color: (colors % 10) + 1,
      locale: null,
      onboardedAt: null,
    })
    .returning("id")
    .executeTakeFirstOrThrow();
  return row.id;
};

let isins = 0;
const insertShare = async (): Promise<string> => {
  isins += 1;
  const row = await db
    .insertInto("shares")
    .values({
      isin: `FR${String(isins).padStart(9, "0")}0`,
      name: "Example Fund",
      kind: "manual",
      tradingCurrency: null,
      providerSymbol: null,
      exchange: null,
      historyStartsOn: null,
      createdBy: null,
    })
    .returning("id")
    .executeTakeFirstOrThrow();
  return row.id;
};

const insertChange = (
  change: Pick<NewPortfolioChange, "userId" | "shareId"> &
    Partial<NewPortfolioChange>,
) =>
  db
    .insertInto("portfolioChanges")
    .values({ quantityDelta: "3", effectiveAt: AT, createdBy: null, ...change })
    .returningAll()
    .executeTakeFirstOrThrow();

const insertCash = (
  balance: Pick<NewCashBalance, "userId"> & Partial<NewCashBalance>,
) =>
  db
    .insertInto("cashBalances")
    .values({ amountEur: "30", effectiveAt: AT, createdBy: null, ...balance })
    .returningAll()
    .executeTakeFirstOrThrow();

describe("portfolio_changes", () => {
  it("gets a version 7 uuid and created_at, and keeps every decimal", async () => {
    const row = await insertChange({
      userId: await insertPerson(),
      shareId: await insertShare(),
      quantityDelta: "74.328",
    });
    expect(row.id).toMatch(UUID_V7);
    expect(row.createdAt).toBeInstanceOf(Date);
    expect(row.quantityDelta).toBe("74.328");
  });

  it("takes the client's id", async () => {
    const id = "0f8e2b4a-1c3d-4e5f-8a9b-0c1d2e3f4a5b";
    const row = await insertChange({
      id,
      userId: await insertPerson(),
      shareId: await insertShare(),
    });
    expect(row.id).toBe(id);
  });

  it("refuses a change of zero", async () => {
    await expect(
      insertChange({
        userId: await insertPerson(),
        shareId: await insertShare(),
        quantityDelta: "0.000",
      }),
    ).rejects.toThrow("portfolio_changes_quantity_delta_check");
  });

  it("go with their person, and forget who recorded them", async () => {
    const admin = await insertPerson();
    const member = await insertPerson();
    const shareId = await insertShare();
    await insertChange({ userId: member, shareId, createdBy: admin });
    await insertChange({ userId: admin, shareId, createdBy: admin });

    await db.deleteFrom("user").where("id", "=", admin).execute();
    const rows = await db.selectFrom("portfolioChanges").selectAll().execute();
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ userId: member, createdBy: null });
  });

  it("keep their share from being deleted", async () => {
    const shareId = await insertShare();
    await insertChange({ userId: await insertPerson(), shareId });
    await expect(
      db.deleteFrom("shares").where("id", "=", shareId).execute(),
    ).rejects.toThrow("portfolio_changes_share_id_fkey");
  });
});

describe("cash_balances", () => {
  it("gets a version 7 uuid and created_at", async () => {
    const row = await insertCash({ userId: await insertPerson() });
    expect(row.id).toMatch(UUID_V7);
    expect(row.createdAt).toBeInstanceOf(Date);
    expect(row.amountEur).toBe("30");
  });

  it("takes zero and refuses a negative amount", async () => {
    const userId = await insertPerson();
    await insertCash({ userId, amountEur: "0" });
    await expect(insertCash({ userId, amountEur: "-0.01" })).rejects.toThrow(
      "cash_balances_amount_eur_check",
    );
  });

  it("go with their person, and forget who recorded them", async () => {
    const admin = await insertPerson();
    const member = await insertPerson();
    await insertCash({ userId: member, createdBy: admin });
    await insertCash({ userId: admin, createdBy: admin });

    await db.deleteFrom("user").where("id", "=", admin).execute();
    const rows = await db.selectFrom("cashBalances").selectAll().execute();
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ userId: member, createdBy: null });
  });
});

describe("current_positions", () => {
  it("sums each person's changes per share, and keeps holdings above zero", async () => {
    const alex = await insertPerson();
    const sam = await insertPerson();
    const fund = await insertShare();
    const other = await insertShare();
    const later = new Date("2026-03-03T09:00:00Z");
    await insertChange({ userId: alex, shareId: fund, quantityDelta: "10.5" });
    await insertChange({
      userId: alex,
      shareId: fund,
      quantityDelta: "-2.25",
      effectiveAt: later,
    });
    await insertChange({ userId: alex, shareId: other, quantityDelta: "4" });
    await insertChange({
      userId: alex,
      shareId: other,
      quantityDelta: "-4",
      effectiveAt: later,
    });
    await insertChange({ userId: sam, shareId: fund, quantityDelta: "1" });

    const rows = await db
      .selectFrom("currentPositions")
      .selectAll()
      .orderBy("userId")
      .execute();
    expect(rows).toEqual(
      [
        { userId: alex, shareId: fund, quantity: "8.25" },
        { userId: sam, shareId: fund, quantity: "1" },
      ].sort((a, b) => a.userId.localeCompare(b.userId)),
    );
  });
});

describe("tables", () => {
  it("each carry created_at", async () => {
    const { rows } = await sql<{ tableName: string }>`
      select table_name from information_schema.columns
      where table_schema = 'public' and column_name = 'created_at'
        and table_name in ('portfolio_changes', 'cash_balances')
      order by table_name
    `.execute(db);
    expect(rows.map((row) => row.tableName)).toEqual([
      "cash_balances",
      "portfolio_changes",
    ]);
  });

  it("are indexed for holdings, a share's holders, cash, and deleting a person", async () => {
    const { rows } = await sql<{ indexdef: string }>`
      select indexdef from pg_indexes
      where schemaname = 'public'
        and tablename in ('portfolio_changes', 'cash_balances')
        and indexname <> tablename || '_pkey'
      order by indexname
    `.execute(db);
    expect(rows.map((row) => row.indexdef)).toEqual([
      "CREATE INDEX cash_balances_created_by_idx ON public.cash_balances USING btree (created_by)",
      "CREATE INDEX cash_balances_user_id_effective_at_idx ON public.cash_balances USING btree (user_id, effective_at)",
      "CREATE INDEX portfolio_changes_created_by_idx ON public.portfolio_changes USING btree (created_by)",
      "CREATE INDEX portfolio_changes_share_id_effective_at_idx ON public.portfolio_changes USING btree (share_id, effective_at)",
      "CREATE INDEX portfolio_changes_user_id_share_id_effective_at_idx ON public.portfolio_changes USING btree (user_id, share_id, effective_at)",
    ]);
  });
});

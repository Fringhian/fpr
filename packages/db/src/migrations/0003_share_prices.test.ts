import { sql } from "kysely";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import type { Db } from "../database.js";
import type {
  ManualPriceAction,
  NewManualPriceEvent,
} from "../tables/manual-price-event.js";
import type { NewPrice, PriceSource } from "../tables/price.js";
import type { NewShare, ShareKind } from "../tables/share.js";
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
  await db.deleteFrom("shares").execute();
  await db.deleteFrom("user").execute();
});

const AT = new Date("2026-03-02T16:30:00Z");

const marketShare = (changes: Partial<NewShare> = {}): NewShare => ({
  isin: "US0000000001",
  name: "Example Corp",
  kind: "market",
  tradingCurrency: "USD",
  providerSymbol: "EXC.US",
  exchange: "US",
  historyStartsOn: null,
  createdBy: null,
  ...changes,
});

const manualShare = (changes: Partial<NewShare> = {}): NewShare => ({
  isin: "FR0000000002",
  name: "Example Fund",
  kind: "manual",
  tradingCurrency: null,
  providerSymbol: null,
  exchange: null,
  historyStartsOn: null,
  createdBy: null,
  ...changes,
});

const insertShare = (share: NewShare) =>
  db
    .insertInto("shares")
    .values(share)
    .returningAll()
    .executeTakeFirstOrThrow();

const insertPerson = (email = "alex@example.com") =>
  db
    .insertInto("user")
    .values({
      email,
      displayName: "Alex",
      avatarKey: null,
      role: "member",
      color: 1,
      locale: null,
      onboardedAt: null,
    })
    .returningAll()
    .executeTakeFirstOrThrow();

const insertPrice = (shareId: string, changes: Partial<NewPrice> = {}) =>
  db
    .insertInto("prices")
    .values({
      shareId,
      at: AT,
      priceEur: "40.10",
      source: "close",
      enteredBy: null,
      ...changes,
    })
    .returningAll()
    .executeTakeFirstOrThrow();

const insertEvent = (
  shareId: string,
  changes: Partial<NewManualPriceEvent> = {},
) =>
  db
    .insertInto("manualPriceEvents")
    .values({
      shareId,
      at: AT,
      action: "added",
      priceEur: "40.10",
      previousPriceEur: null,
      userId: null,
      ...changes,
    })
    .returningAll()
    .executeTakeFirstOrThrow();

describe("shares", () => {
  it("gets a version 7 uuid and created_at, and reads a date as YYYY-MM-DD", async () => {
    const row = await insertShare(
      marketShare({ historyStartsOn: "2025-11-12" }),
    );
    expect(row.id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
    );
    expect(row.createdAt).toBeInstanceOf(Date);
    expect(row.historyStartsOn).toBe("2025-11-12");
  });

  it("refuses a second share with the same ISIN", async () => {
    await insertShare(marketShare());
    await expect(
      insertShare(manualShare({ isin: "US0000000001" })),
    ).rejects.toThrow("shares_isin_key");
  });

  it("requires an ISIN in its format", async () => {
    await expect(
      insertShare(marketShare({ isin: null as unknown as string })),
    ).rejects.toThrow('null value in column "isin"');
    for (const isin of ["us0000000001", "US000000001", "US00000000AB"]) {
      await expect(insertShare(marketShare({ isin }))).rejects.toThrow(
        "shares_isin_check",
      );
    }
  });

  it("refuses an empty name", async () => {
    await expect(insertShare(marketShare({ name: "" }))).rejects.toThrow(
      "shares_name_check",
    );
  });

  it("accepts market and manual kinds, and refuses any other", async () => {
    await insertShare(marketShare());
    await insertShare(manualShare());
    await expect(
      insertShare(
        manualShare({ isin: "FR0000000003", kind: "fund" as ShareKind }),
      ),
    ).rejects.toThrow("shares_kind_check");
  });

  it("takes a 3-letter uppercase trading currency", async () => {
    await insertShare(marketShare({ tradingCurrency: "GBX" }));
    for (const [index, tradingCurrency] of ["usd", "EURO", "E1"].entries()) {
      await expect(
        insertShare(
          marketShare({ isin: `US000000001${index}`, tradingCurrency }),
        ),
      ).rejects.toThrow("shares_trading_currency_check");
    }
  });

  it("gives a market share a listing, and a manual share none", async () => {
    for (const changes of [
      { providerSymbol: null },
      { exchange: null },
      { tradingCurrency: null },
    ]) {
      await expect(insertShare(marketShare(changes))).rejects.toThrow(
        "shares_listing_check",
      );
    }
    for (const changes of [{ providerSymbol: "EXF.PA" }, { exchange: "PA" }]) {
      await expect(insertShare(manualShare(changes))).rejects.toThrow(
        "shares_listing_check",
      );
    }
    await insertShare(manualShare({ tradingCurrency: "EUR" }));
  });

  it("keeps a share once its creator is deleted, with created_by empty", async () => {
    const person = await insertPerson();
    const share = await insertShare(manualShare({ createdBy: person.id }));
    await db.deleteFrom("user").where("id", "=", person.id).execute();
    const row = await db
      .selectFrom("shares")
      .selectAll()
      .where("id", "=", share.id)
      .executeTakeFirstOrThrow();
    expect(row.createdBy).toBeNull();
  });
});

describe("prices", () => {
  it("keeps the price as a decimal string, with created_at", async () => {
    const share = await insertShare(marketShare());
    const row = await insertPrice(share.id, { priceEur: "40.10" });
    expect(row.priceEur).toBe("40.10");
    expect(row.at).toEqual(AT);
    expect(row.createdAt).toBeInstanceOf(Date);
  });

  it("refuses a second price for the same share and moment, in any offset", async () => {
    const share = await insertShare(marketShare());
    await insertPrice(share.id);
    await expect(
      insertPrice(share.id, { at: new Date("2026-03-02T17:30:00+01:00") }),
    ).rejects.toThrow("prices_pkey");
  });

  it("keeps the price above zero", async () => {
    const share = await insertShare(marketShare());
    for (const priceEur of ["0", "-1.5"]) {
      await expect(insertPrice(share.id, { priceEur })).rejects.toThrow(
        "prices_price_eur_check",
      );
    }
  });

  it("accepts close, intraday, and manual sources, and refuses any other", async () => {
    const share = await insertShare(marketShare());
    for (const [hour, source] of ["close", "intraday", "manual"].entries()) {
      await insertPrice(share.id, {
        at: new Date(Date.UTC(2026, 2, 2, hour)),
        source: source as PriceSource,
      });
    }
    await expect(
      insertPrice(share.id, { source: "open" as PriceSource }),
    ).rejects.toThrow("prices_source_check");
  });

  it("has entered_by on manual prices only", async () => {
    const person = await insertPerson();
    const share = await insertShare(marketShare());
    for (const source of ["close", "intraday"] as const) {
      await expect(
        insertPrice(share.id, { source, enteredBy: person.id }),
      ).rejects.toThrow("prices_entered_by_check");
    }
    await insertPrice(share.id, { source: "manual", enteredBy: person.id });
  });

  it("keeps a manual price once its author is deleted, with entered_by empty", async () => {
    const person = await insertPerson();
    const share = await insertShare(manualShare());
    await insertPrice(share.id, { source: "manual", enteredBy: person.id });
    await db.deleteFrom("user").where("id", "=", person.id).execute();
    const row = await db
      .selectFrom("prices")
      .selectAll()
      .executeTakeFirstOrThrow();
    expect(row.enteredBy).toBeNull();
  });

  it("refuses a price for an unknown share", async () => {
    await expect(
      insertPrice("01900000-0000-7000-8000-000000000000"),
    ).rejects.toThrow("prices_share_id_fkey");
  });
});

describe("manual_price_events", () => {
  it("gets a version 7 uuid and created_at", async () => {
    const share = await insertShare(manualShare());
    const row = await insertEvent(share.id);
    expect(row.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-7/);
    expect(row.createdAt).toBeInstanceOf(Date);
    expect(row.priceEur).toBe("40.10");
  });

  it("accepts added, edited, and deleted, and refuses any other", async () => {
    const share = await insertShare(manualShare());
    await insertEvent(share.id, {
      action: "added",
      priceEur: "40",
      previousPriceEur: null,
    });
    await insertEvent(share.id, {
      action: "edited",
      priceEur: "41",
      previousPriceEur: "40",
    });
    await insertEvent(share.id, {
      action: "deleted",
      priceEur: null,
      previousPriceEur: "41",
    });
    await expect(
      insertEvent(share.id, { action: "moved" as ManualPriceAction }),
    ).rejects.toThrow("manual_price_events_action_check");
  });

  it("has the prices each action calls for", async () => {
    const share = await insertShare(manualShare());
    const invalid: Partial<NewManualPriceEvent>[] = [
      { action: "added", priceEur: null, previousPriceEur: null },
      { action: "added", priceEur: "40", previousPriceEur: "41" },
      { action: "edited", priceEur: null, previousPriceEur: "41" },
      { action: "edited", priceEur: "40", previousPriceEur: null },
      { action: "deleted", priceEur: "40", previousPriceEur: "41" },
      { action: "deleted", priceEur: null, previousPriceEur: null },
    ];
    for (const changes of invalid) {
      await expect(insertEvent(share.id, changes)).rejects.toThrow(
        "manual_price_events_prices_check",
      );
    }
  });

  it("keeps both prices above zero", async () => {
    const share = await insertShare(manualShare());
    await expect(
      insertEvent(share.id, { action: "added", priceEur: "0" }),
    ).rejects.toThrow("manual_price_events_price_eur_check");
    await expect(
      insertEvent(share.id, {
        action: "deleted",
        priceEur: null,
        previousPriceEur: "-1",
      }),
    ).rejects.toThrow("manual_price_events_previous_price_eur_check");
  });

  it("keeps an event once its author is deleted, with user_id empty", async () => {
    const person = await insertPerson();
    const share = await insertShare(manualShare());
    const event = await insertEvent(share.id, { userId: person.id });
    await db.deleteFrom("user").where("id", "=", person.id).execute();
    const row = await db
      .selectFrom("manualPriceEvents")
      .selectAll()
      .where("id", "=", event.id)
      .executeTakeFirstOrThrow();
    expect(row.userId).toBeNull();
  });
});

describe("deleting a share", () => {
  it("deletes its prices and value edits, and no other share's", async () => {
    const fund = await insertShare(manualShare());
    const other = await insertShare(marketShare());
    await insertPrice(fund.id, { source: "manual" });
    await insertEvent(fund.id);
    await insertPrice(other.id);

    await db.deleteFrom("shares").where("id", "=", fund.id).execute();

    const prices = await db.selectFrom("prices").select("shareId").execute();
    expect(prices).toEqual([{ shareId: other.id }]);
    expect(
      await db.selectFrom("manualPriceEvents").selectAll().execute(),
    ).toEqual([]);
  });
});

describe("tables", () => {
  it("each carry created_at", async () => {
    const { rows } = await sql<{ tableName: string }>`
      select table_name from information_schema.columns
      where table_schema = 'public' and column_name = 'created_at'
        and table_name in ('shares', 'prices', 'manual_price_events')
      order by table_name
    `.execute(db);
    expect(rows.map((row) => row.tableName)).toEqual([
      "manual_price_events",
      "prices",
      "shares",
    ]);
  });

  it("key prices by share and moment", async () => {
    const { rows } = await sql<{ indexdef: string }>`
      select indexdef from pg_indexes
      where schemaname = 'public' and indexname = 'prices_pkey'
    `.execute(db);
    expect(rows.map((row) => row.indexdef)).toEqual([
      "CREATE UNIQUE INDEX prices_pkey ON public.prices USING btree (share_id, at)",
    ]);
  });

  it("are indexed for deleting a person, a share's value edits, and old intraday prices", async () => {
    const { rows } = await sql<{ indexname: string; indexdef: string }>`
      select indexname, indexdef from pg_indexes
      where schemaname = 'public'
        and tablename in ('shares', 'prices', 'manual_price_events')
        and indexname not like '%_pkey' and indexname not like '%_key'
      order by indexname
    `.execute(db);
    expect(rows).toEqual([
      {
        indexname: "manual_price_events_share_id_at_idx",
        indexdef:
          "CREATE INDEX manual_price_events_share_id_at_idx ON public.manual_price_events USING btree (share_id, at)",
      },
      {
        indexname: "manual_price_events_user_id_idx",
        indexdef:
          "CREATE INDEX manual_price_events_user_id_idx ON public.manual_price_events USING btree (user_id)",
      },
      {
        indexname: "prices_entered_by_idx",
        indexdef:
          "CREATE INDEX prices_entered_by_idx ON public.prices USING btree (entered_by)",
      },
      {
        indexname: "prices_intraday_at_idx",
        indexdef:
          "CREATE INDEX prices_intraday_at_idx ON public.prices USING btree (at) WHERE (source = 'intraday'::text)",
      },
      {
        indexname: "shares_created_by_idx",
        indexdef:
          "CREATE INDEX shares_created_by_idx ON public.shares USING btree (created_by)",
      },
    ]);
  });
});

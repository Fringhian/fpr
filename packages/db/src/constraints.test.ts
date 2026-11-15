import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import type { Db } from "./database.js";
import type { NewManualPriceEvent } from "./tables/manual-price-event.js";
import type { NewPrice } from "./tables/price.js";
import type { NewShare } from "./tables/share.js";
import type { NewUser } from "./tables/user.js";
import { createTestDatabase, type TestDatabase } from "./testing.js";

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

const AT = new Date("2026-03-02T16:30:00Z");

let people = 0;
const insertPerson = async (changes: Partial<NewUser> = {}) => {
  people += 1;
  const row = await db
    .insertInto("user")
    .values({
      email: `person${people}@example.com`,
      displayName: `Person ${people}`,
      avatarKey: null,
      role: "member",
      color: (people % 10) + 1,
      locale: null,
      onboardedAt: null,
      ...changes,
    })
    .returning("id")
    .executeTakeFirstOrThrow();
  return row.id;
};

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

const insertShare = async (share: NewShare) => {
  const row = await db
    .insertInto("shares")
    .values(share)
    .returning("id")
    .executeTakeFirstOrThrow();
  return row.id;
};

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
    .execute();

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
    .execute();

const insertChange = (
  userId: string,
  shareId: string,
  quantityDelta = "3",
  createdBy: string | null = null,
) =>
  db
    .insertInto("portfolioChanges")
    .values({ userId, shareId, quantityDelta, effectiveAt: AT, createdBy })
    .execute();

const insertCash = (
  userId: string,
  amountEur = "30",
  createdBy: string | null = null,
) =>
  db
    .insertInto("cashBalances")
    .values({ userId, amountEur, effectiveAt: AT, createdBy })
    .execute();

const insertAccessKey = (
  userId: string,
  codeHash: string,
  createdBy: string | null = null,
) =>
  db
    .insertInto("accessKeys")
    .values({
      userId,
      codeHash,
      claimedAt: null,
      accessUntil: null,
      revokedAt: null,
      createdBy,
    })
    .returning("id")
    .executeTakeFirstOrThrow();

const insertResetKey = (
  userId: string,
  codeHash: string,
  createdBy: string | null = null,
) =>
  db
    .insertInto("resetKeys")
    .values({ userId, codeHash, usedAt: null, revokedAt: null, createdBy })
    .execute();

describe("people and keys", () => {
  it("refuse a second person with the same email", async () => {
    await insertPerson({ email: "alex@example.com" });
    await expect(insertPerson({ email: "alex@example.com" })).rejects.toThrow(
      "user_email_key",
    );
  });

  it("refuse a second key with the same hash", async () => {
    const alex = await insertPerson();
    const sam = await insertPerson();
    await insertAccessKey(alex, "access");
    await expect(insertAccessKey(sam, "access")).rejects.toThrow(
      "access_keys_code_hash_key",
    );
    await insertResetKey(alex, "reset");
    await expect(insertResetKey(sam, "reset")).rejects.toThrow(
      "reset_keys_code_hash_key",
    );
  });

  it("give a person at most one access key that is not revoked", async () => {
    const userId = await insertPerson();
    const first = await insertAccessKey(userId, "first");
    await expect(insertAccessKey(userId, "second")).rejects.toThrow(
      "access_keys_one_unrevoked_per_user_idx",
    );

    await db
      .updateTable("accessKeys")
      .set({ revokedAt: new Date() })
      .where("id", "=", first.id)
      .execute();
    await insertAccessKey(userId, "second");

    await expect(
      db
        .updateTable("accessKeys")
        .set({ revokedAt: null })
        .where("id", "=", first.id)
        .execute(),
    ).rejects.toThrow("access_keys_one_unrevoked_per_user_idx");
  });
});

describe("shares", () => {
  it("refuse a second share with the same ISIN", async () => {
    await insertShare(marketShare());
    await expect(
      insertShare(manualShare({ isin: "US0000000001" })),
    ).rejects.toThrow("shares_isin_key");
  });

  it("require an ISIN in its format", async () => {
    for (const isin of ["us0000000001", "US000000001", "US00000000AB"]) {
      await expect(insertShare(marketShare({ isin }))).rejects.toThrow(
        "shares_isin_check",
      );
    }
  });

  it("give a market share a listing, and a manual share none", async () => {
    for (const changes of [
      { providerSymbol: null },
      { exchange: null },
      { tradingCurrency: null },
    ]) {
      await expect(insertShare(marketShare(changes))).rejects.toThrow(
        "shares_listing_check",
      );
    }
    for (const changes of [
      { providerSymbol: "EXF.PA" },
      { exchange: "PA" },
      { tradingCurrency: "EUR" },
    ]) {
      await expect(insertShare(manualShare(changes))).rejects.toThrow(
        "shares_listing_check",
      );
    }
  });
});

describe("prices", () => {
  it("refuse a second price for the same share and moment, in any offset", async () => {
    const shareId = await insertShare(marketShare());
    await insertPrice(shareId);
    await expect(
      insertPrice(shareId, { at: new Date("2026-03-02T17:30:00+01:00") }),
    ).rejects.toThrow("prices_pkey");
  });

  it("stay above zero", async () => {
    const shareId = await insertShare(marketShare());
    for (const priceEur of ["0", "-1.5"]) {
      await expect(insertPrice(shareId, { priceEur })).rejects.toThrow(
        "prices_price_eur_check",
      );
    }
  });

  it("have entered_by on manual prices only", async () => {
    const person = await insertPerson();
    const shareId = await insertShare(marketShare());
    for (const source of ["close", "intraday"] as const) {
      await expect(
        insertPrice(shareId, { source, enteredBy: person }),
      ).rejects.toThrow("prices_entered_by_check");
    }
    await insertPrice(shareId, { source: "manual", enteredBy: person });
  });

  it("record the values each value edit calls for", async () => {
    const shareId = await insertShare(manualShare());
    const invalid: Partial<NewManualPriceEvent>[] = [
      { action: "added", priceEur: null, previousPriceEur: null },
      { action: "added", priceEur: "40", previousPriceEur: "41" },
      { action: "edited", priceEur: null, previousPriceEur: "41" },
      { action: "edited", priceEur: "40", previousPriceEur: null },
      { action: "deleted", priceEur: "40", previousPriceEur: "41" },
      { action: "deleted", priceEur: null, previousPriceEur: null },
    ];
    for (const changes of invalid) {
      await expect(insertEvent(shareId, changes)).rejects.toThrow(
        "manual_price_events_prices_check",
      );
    }
  });
});

describe("portfolios", () => {
  it("refuse a change of zero and a negative cash balance", async () => {
    const userId = await insertPerson();
    const shareId = await insertShare(manualShare());
    await expect(insertChange(userId, shareId, "0.000")).rejects.toThrow(
      "portfolio_changes_quantity_delta_check",
    );
    await insertCash(userId, "0");
    await expect(insertCash(userId, "-0.01")).rejects.toThrow(
      "cash_balances_amount_eur_check",
    );
  });
});

describe("deleting a person", () => {
  it("deletes their own rows, and keeps what they wrote for others with no author", async () => {
    const admin = await insertPerson({ role: "admin" });
    const member = await insertPerson();
    const fund = await insertShare(manualShare({ createdBy: admin }));
    const now = new Date();
    await db
      .insertInto("account")
      .values({
        accountId: admin,
        providerId: "credential",
        userId: admin,
        accessToken: null,
        refreshToken: null,
        idToken: null,
        accessTokenExpiresAt: null,
        refreshTokenExpiresAt: null,
        scope: null,
        password: "hash",
        updatedAt: now,
      })
      .execute();
    await db
      .insertInto("session")
      .values({
        expiresAt: now,
        token: "token",
        updatedAt: now,
        ipAddress: null,
        userAgent: null,
        userId: admin,
      })
      .execute();
    await insertAccessKey(admin, "admin's access");
    await insertAccessKey(member, "member's access", admin);
    await insertResetKey(admin, "admin's reset");
    await insertResetKey(member, "member's reset", admin);
    await insertChange(admin, fund, "3", admin);
    await insertChange(member, fund, "3", admin);
    await insertCash(admin, "30", admin);
    await insertCash(member, "30", admin);
    await insertPrice(fund, { source: "manual", enteredBy: admin });
    await insertEvent(fund, { userId: admin });

    await db.deleteFrom("user").where("id", "=", admin).execute();

    expect(await db.selectFrom("account").selectAll().execute()).toEqual([]);
    expect(await db.selectFrom("session").selectAll().execute()).toEqual([]);
    for (const table of [
      "accessKeys",
      "resetKeys",
      "portfolioChanges",
      "cashBalances",
    ] as const) {
      expect(
        await db.selectFrom(table).select(["userId", "createdBy"]).execute(),
      ).toEqual([{ userId: member, createdBy: null }]);
    }
    expect(
      await db.selectFrom("shares").select(["id", "createdBy"]).execute(),
    ).toEqual([{ id: fund, createdBy: null }]);
    expect(await db.selectFrom("prices").select("enteredBy").execute()).toEqual(
      [{ enteredBy: null }],
    );
    expect(
      await db.selectFrom("manualPriceEvents").select("userId").execute(),
    ).toEqual([{ userId: null }]);
  });
});

describe("deleting a share", () => {
  it("is refused while a portfolio change refers to it", async () => {
    const shareId = await insertShare(manualShare());
    await insertChange(await insertPerson(), shareId);
    await expect(
      db.deleteFrom("shares").where("id", "=", shareId).execute(),
    ).rejects.toThrow("portfolio_changes_share_id_fkey");
  });

  it("deletes its prices and value edits, and no other share's", async () => {
    const fund = await insertShare(manualShare());
    const other = await insertShare(marketShare());
    await insertPrice(fund, { source: "manual" });
    await insertEvent(fund);
    await insertPrice(other);

    await db.deleteFrom("shares").where("id", "=", fund).execute();

    expect(await db.selectFrom("prices").select("shareId").execute()).toEqual([
      { shareId: other },
    ]);
    expect(
      await db.selectFrom("manualPriceEvents").selectAll().execute(),
    ).toEqual([]);
  });
});

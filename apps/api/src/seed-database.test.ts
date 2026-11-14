import { createHash } from "node:crypto";
import { accessKeys, type Db, portfolioChanges } from "@fpr/db";
import { createTestDatabase, type TestDatabase } from "@fpr/db/testing";
import { verifyPassword } from "better-auth/crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  refuseProduction,
  type SeedResult,
  seedDatabase,
  zonedMoment,
} from "./seed-database.js";

const NOW = new Date("2026-11-14T15:00:00Z");
const PUBLIC_URL = "http://localhost:5173/";

let test: TestDatabase;
let db: Db;
let result: SeedResult;

beforeAll(async () => {
  test = await createTestDatabase();
  db = test.db;
  result = await seedDatabase(db, {
    publicUrl: PUBLIC_URL,
    timeZone: "Europe/Paris",
    now: NOW,
  });
});

afterAll(async () => {
  await test.drop();
});

describe("refuseProduction", () => {
  it("stops in production only", () => {
    expect(() => refuseProduction("production")).toThrow("production");
    expect(() => refuseProduction("development")).not.toThrow();
    expect(() => refuseProduction(undefined)).not.toThrow();
  });
});

describe("zonedMoment", () => {
  it("places a wall-clock time in its time zone, summer and winter", () => {
    expect(zonedMoment("2026-07-01", [23, 59, 59], "Europe/Paris")).toEqual(
      new Date("2026-07-01T21:59:59Z"),
    );
    expect(zonedMoment("2026-01-05", [23, 59, 59], "Europe/Paris")).toEqual(
      new Date("2026-01-05T22:59:59Z"),
    );
  });
});

describe("seedDatabase", () => {
  it("adds people of every role, each with one key that is not revoked", async () => {
    const rows = await db.selectFrom("user").selectAll().execute();
    expect(new Set(rows.map((row) => row.role))).toEqual(
      new Set(["admin", "member", "guest", "anonymous"]),
    );
    expect(new Set(rows.map((row) => row.color)).size).toBe(rows.length);
    for (const row of rows) {
      expect(row.email).toMatch(/@(example\.com|anonymous\.invalid)$/);
      const keys = await db
        .selectFrom("accessKeys")
        .selectAll()
        .where("userId", "=", row.id)
        .execute();
      expect(keys).toHaveLength(1);
      expect(keys[0]?.revokedAt).toBeNull();
    }
    const viewer = rows.find((row) => row.role === "anonymous");
    expect(viewer?.email).toBe(`${viewer?.id}@anonymous.invalid`);
  });

  it("gives password users a password and the rest a link", async () => {
    const accounts = await db
      .selectFrom("account")
      .innerJoin("user", "user.id", "account.userId")
      .select(["user.role", "account.password", "account.providerId"])
      .execute();
    expect(accounts.length).toBeGreaterThan(0);
    expect(accounts.some((account) => account.role === "anonymous")).toBe(
      false,
    );
    for (const account of accounts) {
      expect(account.providerId).toBe("credential");
      expect(
        await verifyPassword({
          hash: account.password ?? "",
          password: result.password,
        }),
      ).toBe(true);
    }

    const linked = result.people.filter((person) => person.accessLink);
    expect(linked.map((person) => person.role).sort()).toEqual([
      "anonymous",
      "member",
    ]);
    for (const person of linked) {
      const key = person.accessLink?.split("/access/")[1] ?? "";
      expect(person.accessLink).toMatch(/^http:\/\/localhost:5173\/access\//);
      expect(key).toMatch(/^[A-Za-z0-9_-]{43}$/);
      const row = await accessKeys.findByCodeHash(
        db,
        createHash("sha256").update(key).digest("hex"),
      );
      expect(row?.claimedAt === null).toBe(person.role === "member");
      expect(await accessKeys.hasAccess(db, row?.userId ?? "")).toBe(
        person.role === "anonymous",
      );
    }
  });

  it("stores listings with closes, and manual shares with value points", async () => {
    const shares = await db.selectFrom("shares").selectAll().execute();
    const market = shares.filter((share) => share.kind === "market");
    const manual = shares.filter((share) => share.kind === "manual");
    expect(market.length).toBeGreaterThanOrEqual(3);
    expect(manual.length).toBeGreaterThanOrEqual(2);

    for (const share of market) {
      const closes = await db
        .selectFrom("prices")
        .select(["at", "source"])
        .where("shareId", "=", share.id)
        .orderBy("at")
        .execute();
      expect(closes.length).toBeGreaterThan(150);
      expect(closes.every((close) => close.source === "close")).toBe(true);
      expect(closes.at(-1)?.at).toEqual(new Date("2026-11-13T22:59:59Z"));
    }
    for (const share of manual) {
      const points = await db
        .selectFrom("prices")
        .select(["at", "source", "enteredBy"])
        .where("shareId", "=", share.id)
        .execute();
      const added = await db
        .selectFrom("manualPriceEvents")
        .select("at")
        .where("shareId", "=", share.id)
        .where("action", "=", "added")
        .execute();
      expect(points.length).toBeGreaterThan(1);
      expect(points.every((point) => point.source === "manual")).toBe(true);
      expect(points.every((point) => point.enteredBy !== null)).toBe(true);
      expect(added.map((event) => event.at).sort()).toEqual(
        points.map((point) => point.at).sort(),
      );
    }
  });

  it("spreads changes and cash over months, never below zero", async () => {
    const holders = await db
      .selectFrom("portfolioChanges")
      .innerJoin("user", "user.id", "portfolioChanges.userId")
      .select(["userId", "shareId", "role", "effectiveAt"])
      .execute();
    expect(new Set(holders.map((row) => row.role))).toEqual(
      new Set(["admin", "member"]),
    );
    const moments = holders.map((row) => row.effectiveAt.getTime());
    const months = (Math.max(...moments) - Math.min(...moments)) / 2.6e9;
    expect(months).toBeGreaterThan(5);
    expect(Math.max(...moments)).toBeLessThan(NOW.getTime());

    for (const { userId, shareId } of holders) {
      expect(
        await portfolioChanges.belowZero(db, userId, shareId),
      ).toBeUndefined();
      const firstPrice = await db
        .selectFrom("prices")
        .select("at")
        .where("shareId", "=", shareId)
        .orderBy("at")
        .limit(1)
        .executeTakeFirstOrThrow();
      const firstChange = Math.min(
        ...holders
          .filter((row) => row.shareId === shareId)
          .map((row) => row.effectiveAt.getTime()),
      );
      expect(firstPrice.at.getTime()).toBeLessThanOrEqual(firstChange);
    }

    const cash = await db
      .selectFrom("cashBalances")
      .innerJoin("user", "user.id", "cashBalances.userId")
      .select(["role"])
      .execute();
    expect(cash.length).toBeGreaterThan(5);
    expect(cash.every((row) => ["admin", "member"].includes(row.role))).toBe(
      true,
    );
  });

  it("refuses a database that already has people, writing nothing", async () => {
    const before = await db
      .selectFrom("prices")
      .select((eb) => eb.fn.countAll<string>().as("count"))
      .executeTakeFirstOrThrow();
    await expect(
      seedDatabase(db, { publicUrl: PUBLIC_URL, timeZone: "Europe/Paris" }),
    ).rejects.toThrow("empty database");
    const after = await db
      .selectFrom("prices")
      .select((eb) => eb.fn.countAll<string>().as("count"))
      .executeTakeFirstOrThrow();
    expect(after.count).toBe(before.count);
  });
});

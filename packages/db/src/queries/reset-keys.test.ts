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
import type { NewResetKey } from "../tables/reset-key.js";
import { createTestDatabase, type TestDatabase } from "../testing.js";
import {
  findByCodeHash,
  insert,
  markUsed,
  revokeUnused,
} from "./reset-keys.js";
import { insert as insertUser } from "./users.js";

let test: TestDatabase;
let db: Db;
let alex: string;
let sam: string;

beforeAll(async () => {
  test = await createTestDatabase();
  db = test.db;
});

afterAll(async () => {
  await test.drop();
});

beforeEach(async () => {
  const base = {
    avatarKey: null,
    role: "member" as const,
    locale: null,
    onboardedAt: null,
  };
  alex = (
    await insertUser(db, {
      ...base,
      email: "alex@example.com",
      displayName: "Alex",
      color: 1,
    })
  ).id;
  sam = (
    await insertUser(db, {
      ...base,
      email: "sam@example.com",
      displayName: "Sam",
      color: 2,
    })
  ).id;
});

afterEach(async () => {
  await db.deleteFrom("user").execute();
});

const UNKNOWN_ID = "01900000-0000-7000-8000-000000000000";
const HOUR_MS = 60 * 60 * 1000;

const key = (changes: Partial<NewResetKey> = {}): NewResetKey => ({
  userId: alex,
  codeHash: "hash",
  usedAt: null,
  revokedAt: null,
  createdBy: null,
  ...changes,
});

describe("insert", () => {
  it("creates an unused key, valid for 24 hours", async () => {
    const row = await insert(db, key({ createdBy: sam }));
    expect(row).toMatchObject({
      userId: alex,
      codeHash: "hash",
      usedAt: null,
      revokedAt: null,
      createdBy: sam,
    });
    expect(row.expiresAt.getTime() - row.createdAt.getTime()).toBe(
      24 * HOUR_MS,
    );
  });
});

describe("findByCodeHash", () => {
  it("finds a key by its hash, whatever its state", async () => {
    const row = await insert(db, key({ usedAt: new Date() }));
    expect(await findByCodeHash(db, "hash")).toEqual(row);
    expect(await findByCodeHash(db, "other")).toBeUndefined();
  });
});

describe("markUsed", () => {
  it("uses a key once", async () => {
    const row = await insert(db, key());
    const used = await markUsed(db, row.id);
    expect(used?.usedAt).toBeInstanceOf(Date);
    expect(await markUsed(db, row.id)).toBeUndefined();
  });

  it("refuses a revoked key", async () => {
    const row = await insert(db, key({ revokedAt: new Date() }));
    expect(await markUsed(db, row.id)).toBeUndefined();
  });

  it("refuses an expired key", async () => {
    const row = await insert(
      db,
      key({ expiresAt: new Date(Date.now() - HOUR_MS) }),
    );
    expect(await markUsed(db, row.id)).toBeUndefined();
    expect((await findByCodeHash(db, "hash"))?.usedAt).toBeNull();
  });

  it("returns nothing for an unknown key", async () => {
    expect(await markUsed(db, UNKNOWN_ID)).toBeUndefined();
  });
});

describe("revokeUnused", () => {
  it("revokes the person's unused keys only", async () => {
    const usedAt = new Date("2026-03-01T09:00:00Z");
    const revokedAt = new Date("2026-03-02T09:00:00Z");
    await insert(db, key({ codeHash: "unused" }));
    await insert(db, key({ codeHash: "used", usedAt }));
    await insert(db, key({ codeHash: "revoked", revokedAt }));
    await insert(db, key({ userId: sam, codeHash: "sam's" }));

    expect(await revokeUnused(db, alex)).toBe(1);

    expect((await findByCodeHash(db, "unused"))?.revokedAt).toBeInstanceOf(
      Date,
    );
    expect((await findByCodeHash(db, "used"))?.revokedAt).toBeNull();
    expect((await findByCodeHash(db, "revoked"))?.revokedAt).toEqual(revokedAt);
    expect((await findByCodeHash(db, "sam's"))?.revokedAt).toBeNull();
  });

  it("revokes nothing for a person without keys", async () => {
    expect(await revokeUnused(db, alex)).toBe(0);
  });
});

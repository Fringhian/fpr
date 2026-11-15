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
    const row = await insert(db, key());
    expect(row.usedAt).toBeNull();
    expect(row.expiresAt.getTime() - row.createdAt.getTime()).toBe(
      24 * HOUR_MS,
    );
  });
});

describe("markUsed", () => {
  it("uses a key once, before it expires, while it is not revoked", async () => {
    const valid = await insert(db, key({ codeHash: "valid" }));
    expect((await markUsed(db, valid.id))?.usedAt).toBeInstanceOf(Date);
    expect(await markUsed(db, valid.id)).toBeUndefined();

    const revoked = await insert(
      db,
      key({ codeHash: "revoked", revokedAt: new Date() }),
    );
    expect(await markUsed(db, revoked.id)).toBeUndefined();

    const expired = await insert(
      db,
      key({
        codeHash: "expired",
        expiresAt: new Date(Date.now() - HOUR_MS),
      }),
    );
    expect(await markUsed(db, expired.id)).toBeUndefined();
    expect((await findByCodeHash(db, "expired"))?.usedAt).toBeNull();
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
});

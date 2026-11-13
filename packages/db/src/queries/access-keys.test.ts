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
import type { NewAccessKey } from "../tables/access-key.js";
import { createTestDatabase, type TestDatabase } from "../testing.js";
import {
  claim,
  findByCodeHash,
  findCurrent,
  hasAccess,
  insert,
  listCurrent,
  restore,
  revoke,
  setAccessUntil,
} from "./access-keys.js";
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
const DAY_MS = 24 * 60 * 60 * 1000;

const key = (changes: Partial<NewAccessKey> = {}): NewAccessKey => ({
  userId: alex,
  codeHash: "hash",
  claimedAt: null,
  accessUntil: null,
  revokedAt: null,
  createdBy: null,
  ...changes,
});

describe("insert", () => {
  it("creates a waiting key, claimable for 7 days", async () => {
    const row = await insert(db, key({ createdBy: sam }));
    expect(row).toMatchObject({
      userId: alex,
      codeHash: "hash",
      claimedAt: null,
      accessUntil: null,
      revokedAt: null,
      createdBy: sam,
    });
    expect(row.claimBefore.getTime() - row.createdAt.getTime()).toBe(
      7 * DAY_MS,
    );
  });

  it("keeps a given claimBefore", async () => {
    const claimBefore = new Date("2026-03-10T09:00:00Z");
    expect((await insert(db, key({ claimBefore }))).claimBefore).toEqual(
      claimBefore,
    );
  });
});

describe("findByCodeHash", () => {
  it("finds a key by its hash, whatever its state", async () => {
    const row = await insert(db, key({ revokedAt: new Date() }));
    expect(await findByCodeHash(db, "hash")).toEqual(row);
    expect(await findByCodeHash(db, "other")).toBeUndefined();
  });
});

describe("findCurrent", () => {
  it("finds the person's latest key", async () => {
    await insert(db, key({ codeHash: "first", revokedAt: new Date() }));
    const latest = await insert(db, key({ codeHash: "second" }));
    await insert(db, key({ userId: sam, codeHash: "sam's" }));
    expect(await findCurrent(db, alex)).toEqual(latest);
  });

  it("finds nothing for a person without a key", async () => {
    expect(await findCurrent(db, alex)).toBeUndefined();
  });
});

describe("listCurrent", () => {
  it("lists each person's latest key", async () => {
    await insert(db, key({ codeHash: "first", revokedAt: new Date() }));
    const alexLatest = await insert(db, key({ codeHash: "second" }));
    const samLatest = await insert(db, key({ userId: sam, codeHash: "sam's" }));
    const rows = await listCurrent(db);
    expect(rows).toHaveLength(2);
    expect(rows).toEqual(expect.arrayContaining([alexLatest, samLatest]));
  });

  it("is empty with no key", async () => {
    expect(await listCurrent(db)).toEqual([]);
  });
});

describe("hasAccess", () => {
  const claimedAt = new Date("2026-03-01T09:00:00Z");

  it("is true for a claimed key with no end", async () => {
    await insert(db, key({ claimedAt }));
    expect(await hasAccess(db, alex)).toBe(true);
    expect(await hasAccess(db, sam)).toBe(false);
  });

  it("is false for a key not claimed yet", async () => {
    await insert(db, key());
    expect(await hasAccess(db, alex)).toBe(false);
  });

  it("is false for a revoked key", async () => {
    await insert(db, key({ claimedAt, revokedAt: new Date() }));
    expect(await hasAccess(db, alex)).toBe(false);
  });

  it("ends at accessUntil", async () => {
    const accessUntil = new Date("2026-04-01T00:00:00Z");
    await insert(db, key({ claimedAt, accessUntil }));
    expect(await hasAccess(db, alex, new Date("2026-03-31T23:59:59Z"))).toBe(
      true,
    );
    expect(await hasAccess(db, alex, accessUntil)).toBe(false);
    expect(await hasAccess(db, alex)).toBe(false);
  });

  it("holds while accessUntil is in the future", async () => {
    await insert(
      db,
      key({ claimedAt, accessUntil: new Date(Date.now() + DAY_MS) }),
    );
    expect(await hasAccess(db, alex)).toBe(true);
  });

  it("is true when one of the person's keys gives access", async () => {
    await insert(db, key({ codeHash: "old", claimedAt, revokedAt: claimedAt }));
    await insert(db, key({ codeHash: "new", claimedAt }));
    expect(await hasAccess(db, alex)).toBe(true);
  });

  it("is false for a person without a key", async () => {
    expect(await hasAccess(db, UNKNOWN_ID)).toBe(false);
  });
});

describe("claim", () => {
  it("sets claimedAt once", async () => {
    const row = await insert(db, key());
    const at = new Date("2026-03-02T10:00:00Z");
    const claimed = await claim(db, row.id, at);
    expect(claimed).toMatchObject({ id: row.id, claimedAt: at });
    expect(await claim(db, row.id)).toBeUndefined();
    expect((await findByCodeHash(db, "hash"))?.claimedAt).toEqual(at);
  });

  it("claims now by default", async () => {
    const row = await insert(db, key());
    const claimed = await claim(db, row.id);
    expect(claimed?.claimedAt).toBeInstanceOf(Date);
  });

  it("returns nothing for an unknown key", async () => {
    expect(await claim(db, UNKNOWN_ID)).toBeUndefined();
  });
});

describe("revoke and restore", () => {
  it("revokes a key once, and restoring clears revokedAt", async () => {
    const row = await insert(db, key({ claimedAt: new Date() }));
    const revoked = await revoke(db, row.id);
    expect(revoked?.revokedAt).toBeInstanceOf(Date);
    expect(await revoke(db, row.id)).toBeUndefined();
    expect(await hasAccess(db, alex)).toBe(false);

    expect(await restore(db, row.id)).toMatchObject({ revokedAt: null });
    expect(await hasAccess(db, alex)).toBe(true);
  });

  it("return nothing for an unknown key", async () => {
    expect(await revoke(db, UNKNOWN_ID)).toBeUndefined();
    expect(await restore(db, UNKNOWN_ID)).toBeUndefined();
  });
});

describe("setAccessUntil", () => {
  it("moves when access ends, and clears it", async () => {
    const row = await insert(db, key({ claimedAt: new Date() }));
    const past = new Date(Date.now() - DAY_MS);
    expect(await setAccessUntil(db, row.id, past)).toMatchObject({
      accessUntil: past,
    });
    expect(await hasAccess(db, alex)).toBe(false);
    expect(await setAccessUntil(db, row.id, null)).toMatchObject({
      accessUntil: null,
    });
    expect(await hasAccess(db, alex)).toBe(true);
  });

  it("returns nothing for an unknown key", async () => {
    expect(await setAccessUntil(db, UNKNOWN_ID, null)).toBeUndefined();
  });
});

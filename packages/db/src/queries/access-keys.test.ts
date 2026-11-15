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
  findCurrent,
  hasAccess,
  insert,
  listCurrent,
  restore,
  revoke,
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

const DAY_MS = 24 * 60 * 60 * 1000;
const claimedAt = new Date("2026-03-01T09:00:00Z");

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
    const row = await insert(db, key());
    expect(row.claimedAt).toBeNull();
    expect(row.claimBefore.getTime() - row.createdAt.getTime()).toBe(
      7 * DAY_MS,
    );
  });
});

describe("current key", () => {
  it("is each person's latest key", async () => {
    await insert(db, key({ codeHash: "first", revokedAt: new Date() }));
    const alexLatest = await insert(db, key({ codeHash: "second" }));
    const samLatest = await insert(db, key({ userId: sam, codeHash: "sam's" }));
    expect(await findCurrent(db, alex)).toEqual(alexLatest);
    const rows = await listCurrent(db);
    expect(rows).toHaveLength(2);
    expect(rows).toEqual(expect.arrayContaining([alexLatest, samLatest]));
  });
});

describe("hasAccess", () => {
  it("needs a key that is claimed and not revoked", async () => {
    const waiting = await insert(db, key({ codeHash: "waiting" }));
    expect(await hasAccess(db, alex)).toBe(false);

    await claim(db, waiting.id, claimedAt);
    expect(await hasAccess(db, alex)).toBe(true);
    expect(await hasAccess(db, sam)).toBe(false);

    await revoke(db, waiting.id);
    expect(await hasAccess(db, alex)).toBe(false);
    await insert(db, key({ codeHash: "replacement", claimedAt }));
    expect(await hasAccess(db, alex)).toBe(true);
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
});

describe("claim", () => {
  it("sets claimedAt once", async () => {
    const row = await insert(db, key());
    const at = new Date("2026-03-02T10:00:00Z");
    expect(await claim(db, row.id, at)).toMatchObject({ claimedAt: at });
    expect(await claim(db, row.id)).toBeUndefined();
    expect((await findCurrent(db, alex))?.claimedAt).toEqual(at);
  });
});

describe("revoke and restore", () => {
  it("revokes a key once, and restoring gives access back", async () => {
    const row = await insert(db, key({ claimedAt }));
    expect((await revoke(db, row.id))?.revokedAt).toBeInstanceOf(Date);
    expect(await revoke(db, row.id)).toBeUndefined();
    expect(await hasAccess(db, alex)).toBe(false);

    expect(await restore(db, row.id)).toMatchObject({ revokedAt: null });
    expect(await hasAccess(db, alex)).toBe(true);
  });
});

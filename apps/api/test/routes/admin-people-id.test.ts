import { randomUUID } from "node:crypto";
import { apiContract, errorSchema } from "@fpr/contracts";
import { manualPriceEvents, prices, shares, users } from "@fpr/db";
import { createTestDatabase, type TestDatabase } from "@fpr/db/testing";
import { sql } from "kysely";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import type { Auth } from "../../src/auth/auth.js";
import { addResetKey, DAY_MS } from "../access-support.js";
import { addCashBalance, makeLastAdmin } from "../admin-support.js";
import {
  addPerson,
  addSignedIn,
  apiRequest,
  createTestAuth,
  createTestBucket,
  parseOutput,
  serveApp,
  type TestBucket,
  type TestServer,
} from "../test-support.js";

let test: TestDatabase;
let auth: Auth;
let server: TestServer;
let bucket: TestBucket;
let admin: Awaited<ReturnType<typeof addSignedIn>>;

beforeAll(async () => {
  test = await createTestDatabase();
  auth = createTestAuth(test.db);
  bucket = createTestBucket();
  server = await serveApp({ db: test.db, auth, avatars: bucket.avatars });
});

// A new admin for each test, since a last-admin case revokes the others.
beforeEach(async () => {
  admin = await addSignedIn(server, test.db, auth, "admin");
});

afterAll(async () => {
  await server.close();
  await test.drop();
});

function patch(id: string, body: unknown, cookie = admin.cookie) {
  return apiRequest(server, `/admin/people/${id}`, {
    method: "PATCH",
    cookie,
    body,
  });
}

function remove(id: string, cookie = admin.cookie) {
  return apiRequest(server, `/admin/people/${id}`, {
    method: "DELETE",
    cookie,
  });
}

async function expectCode(response: Response, status: number, code: string) {
  expect(response.status).toBe(status);
  expect(errorSchema.parse(await response.json()).error.code).toBe(code);
}

async function countRows(table: string, column: string, id: string) {
  const { rows } = await sql<{ count: string }>`
    select count(*) from ${sql.table(table)} where ${sql.ref(column)} = ${id}
  `.execute(test.db);
  return Number(rows[0]?.count);
}

describe("PATCH /api/admin/people/:id", () => {
  it("changes the display name, email, role, and access end date", async () => {
    const person = await addPerson(test.db, auth, "guest");
    const email = `${randomUUID()}@example.com`;
    const accessUntil = new Date(Date.now() + 10 * DAY_MS).toISOString();

    const response = await patch(person.id, {
      displayName: "Sam",
      email,
      role: "member",
      accessUntil,
    });

    expect(response.status).toBe(200);
    expect(
      parseOutput(apiContract.admin.updatePerson, await response.json()),
    ).toMatchObject({
      displayName: "Sam",
      email,
      role: "member",
      accessUntil,
      accessStatus: "active",
      hasPassword: true,
    });
  });

  it("refuses an email another person has", async () => {
    const [person, other] = await Promise.all([
      addPerson(test.db, auth, "member"),
      addPerson(test.db, auth, "member"),
    ]);

    await expectCode(
      await patch(person.id, { email: other.email }),
      409,
      "email_taken",
    );
  });

  it("refuses an email for an anonymous viewer", async () => {
    const viewer = await addPerson(test.db, auth, "anonymous");

    await expectCode(
      await patch(viewer.id, { email: `${randomUUID()}@example.com` }),
      400,
      "invalid_request",
    );
  });

  it("keeps anonymous viewers anonymous, and everyone else not", async () => {
    const [viewer, member] = await Promise.all([
      addPerson(test.db, auth, "anonymous"),
      addPerson(test.db, auth, "member"),
    ]);

    await expectCode(
      await patch(viewer.id, { role: "member" }),
      422,
      "anonymous_role_fixed",
    );
    await expectCode(
      await patch(member.id, { role: "anonymous" }),
      422,
      "anonymous_role_fixed",
    );
  });

  it("makes a guest only of a person with no portfolio entries", async () => {
    const [holder, empty] = await Promise.all([
      addPerson(test.db, auth, "member"),
      addPerson(test.db, auth, "member"),
    ]);
    await addCashBalance(test.db, holder.id);

    await expectCode(
      await patch(holder.id, { role: "guest" }),
      422,
      "has_portfolio_entries",
    );
    expect((await patch(empty.id, { role: "guest" })).status).toBe(200);
  });

  it("refuses to demote or end the last admin, and allows it with another admin", async () => {
    await makeLastAdmin(test.db, admin.id);
    const past = new Date(Date.now() - 1000).toISOString();

    await expectCode(
      await patch(admin.id, { role: "member" }),
      422,
      "last_admin",
    );
    await expectCode(
      await patch(admin.id, { accessUntil: past }),
      422,
      "last_admin",
    );
    const second = await addPerson(test.db, auth, "admin");
    expect((await patch(second.id, { role: "member" })).status).toBe(200);
  });

  it("ends access with a past end date, and deletes the person's sessions", async () => {
    const person = await addSignedIn(server, test.db, auth, "member");

    const response = await patch(person.id, {
      accessUntil: new Date(Date.now() - 1000).toISOString(),
    });

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ accessStatus: "ended" });
    expect(await countRows("session", "user_id", person.id)).toBe(0);
    const me = await apiRequest(server, "/me", { cookie: person.cookie });
    expect(me.status).toBe(401);
  });

  it("answers not_found for an unknown person", async () => {
    await expectCode(
      await patch(randomUUID(), { displayName: "Nobody" }),
      404,
      "not_found",
    );
  });
});

/** A manual share the person created, with a value point and a value edit of theirs. */
async function addAuthoredShare(userId: string) {
  const share = await shares.insert(test.db, {
    isin: `QZ${randomUUID().replaceAll("-", "").slice(0, 9).toUpperCase()}0`,
    name: "Example fund",
    kind: "manual",
    tradingCurrency: null,
    providerSymbol: null,
    exchange: null,
    historyStartsOn: null,
    createdBy: userId,
  });
  const at = new Date(Date.now() - DAY_MS);
  await prices.upsert(test.db, {
    shareId: share.id,
    at,
    priceEur: "40.10",
    source: "manual",
    enteredBy: userId,
  });
  await manualPriceEvents.insert(test.db, {
    shareId: share.id,
    at,
    action: "added",
    priceEur: "40.10",
    previousPriceEur: null,
    userId,
  });
  return share.id;
}

describe("DELETE /api/admin/people/:id", () => {
  it("deletes the person, their rows, and their picture, and keeps what they authored", async () => {
    const person = await addSignedIn(server, test.db, auth, "member");
    const shareId = await addAuthoredShare(person.id);
    await test.db
      .insertInto("portfolioChanges")
      .values({
        userId: person.id,
        shareId,
        quantityDelta: "3",
        effectiveAt: new Date(Date.now() - 60_000),
        createdBy: person.id,
      })
      .execute();
    await addCashBalance(test.db, person.id);
    await addResetKey(test.db, person.id);
    const avatarKey = `avatars/${person.id}/v1.webp`;
    bucket.objects.set(avatarKey, {
      body: new Uint8Array([1]),
      contentType: "image/webp",
    });
    await users.update(test.db, person.id, { avatarKey });

    const response = await remove(person.id);

    expect(response.status).toBe(204);
    expect(await users.findById(test.db, person.id)).toBeUndefined();
    for (const table of [
      "account",
      "session",
      "access_keys",
      "reset_keys",
      "portfolio_changes",
      "cash_balances",
    ]) {
      expect(await countRows(table, "user_id", person.id)).toBe(0);
    }
    expect(bucket.objects.has(avatarKey)).toBe(false);
    expect((await shares.findById(test.db, shareId))?.createdBy).toBeNull();
    const [price] = await prices.listBetween(
      test.db,
      shareId,
      new Date(0),
      new Date(),
    );
    expect(price?.enteredBy).toBeNull();
    const [event] = await manualPriceEvents.listByShare(test.db, shareId);
    expect(event?.userId).toBeNull();
  });

  it("refuses to delete the last admin", async () => {
    await makeLastAdmin(test.db, admin.id);

    await expectCode(await remove(admin.id), 422, "last_admin");
    expect(await users.findById(test.db, admin.id)).toBeDefined();
  });

  it("answers not_found for an unknown person", async () => {
    await expectCode(await remove(randomUUID()), 404, "not_found");
  });
});

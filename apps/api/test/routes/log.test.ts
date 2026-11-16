import { apiContract, type PortfolioLog } from "@fpr/contracts";
import { createTestDatabase, type TestDatabase } from "@fpr/db/testing";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Auth } from "../../src/auth/auth.js";
import { expectError } from "../access-support.js";
import {
  addShare,
  addSignedIn,
  apiRequest,
  createTestAuth,
  parseOutput,
  pseudonymOf,
  serveApp,
  type TestServer,
} from "../test-support.js";

let test: TestDatabase;
let auth: Auth;
let server: TestServer;

beforeAll(async () => {
  test = await createTestDatabase();
  auth = createTestAuth(test.db);
  server = await serveApp({ db: test.db, auth });
});

afterAll(async () => {
  await server.close();
  await test.drop();
});

const signedIn = (role: "admin" | "member" | "guest" | "anonymous") =>
  addSignedIn(server, test.db, auth, role);

const { log, logEntry } = apiContract.portfolio;

/**
 * A member whose log holds, oldest first: a purchase of 5 recorded by the
 * admin, 30 € of cash, a sale of 2, then 50 € of cash.
 */
async function memberWithLog() {
  const [admin, member] = [await signedIn("admin"), await signedIn("member")];
  const share = await addShare(test.db);
  const write = (cookie: string, path: string, body: object) =>
    apiRequest(server, `/users/${member.id}/${path}`, {
      method: "POST",
      cookie,
      body,
    });
  await write(admin.cookie, "changes", {
    shareId: share.id,
    quantityDelta: "5",
    effectiveAt: "2026-03-02T10:00:00Z",
  });
  await write(member.cookie, "cash-balances", {
    amountEur: "30",
    effectiveAt: "2026-03-03T10:00:00Z",
  });
  await write(member.cookie, "changes", {
    shareId: share.id,
    quantityDelta: "-2",
    effectiveAt: "2026-03-04T10:00:00Z",
  });
  await write(member.cookie, "cash-balances", {
    amountEur: "50",
    effectiveAt: "2026-03-05T10:00:00Z",
  });
  return { admin, member, share };
}

async function readLog(
  cookie: string,
  userId: string,
  query: string,
): Promise<PortfolioLog> {
  const response = await apiRequest(server, `/users/${userId}/log${query}`, {
    cookie,
  });
  expect(response.status).toBe(200);
  return parseOutput(log, await response.json());
}

describe("GET /api/users/:userId/log", () => {
  it("pages through share changes and cash balances, newest first, with who made each and what it changed", async () => {
    const { admin, member } = await memberWithLog();

    const first = await readLog(member.cookie, member.id, "?limit=3");
    expect(first.total).toBe(4);
    expect(first.entries).toMatchObject([
      { type: "cash", amountEur: "50", previousAmountEur: "30" },
      { type: "change", quantityDelta: "-2", quantityAfter: "3" },
      {
        type: "cash",
        amountEur: "30",
        previousAmountEur: null,
        madeBy: { id: member.id },
      },
    ]);
    expect(first.nextBefore).not.toBeNull();

    const second = await readLog(
      member.cookie,
      member.id,
      `?limit=3&before=${encodeURIComponent(first.nextBefore ?? "")}`,
    );
    expect(second.entries).toMatchObject([
      {
        type: "change",
        quantityDelta: "5",
        quantityAfter: "5",
        madeBy: { id: admin.id, displayName: "Test admin" },
      },
    ]);
    expect(second.nextBefore).toBeNull();
  });

  it("shows an anonymous viewer pseudonyms and each entry's weight, never quantities or cash", async () => {
    const { admin, member, share } = await memberWithLog();
    const viewer = await signedIn("anonymous");
    await test.db
      .insertInto("prices")
      .values({
        shareId: share.id,
        at: new Date("2026-03-01T22:59:59Z"),
        priceEur: "10",
        source: "close",
      })
      .execute();

    const response = await apiRequest(server, `/users/${member.id}/log`, {
      cookie: viewer.cookie,
    });

    expect(response.status).toBe(200);
    const body = (await response.json()) as { entries: unknown[] };
    expect(JSON.stringify(body)).not.toContain("Test ");
    // Each entry's value over the balance at its moment: 50 of 80 €, then
    // 2 × 10 of 60 €, 30 of 80 €, and 5 × 10 of 50 €. A sale keeps its sign.
    expect(body.entries).toMatchObject([
      {
        type: "cash",
        amountEur: "62.50",
        previousAmountEur: "62.50",
        madeBy: {
          id: member.id,
          displayName: await pseudonymOf(test.db, member.id),
        },
      },
      { type: "change", quantityDelta: "-33.33", quantityAfter: "33.33" },
      { type: "cash", amountEur: "37.50", previousAmountEur: null },
      {
        type: "change",
        quantityDelta: "100.00",
        madeBy: { displayName: await pseudonymOf(test.db, admin.id) },
      },
    ]);
  });

  it("refuses a before the log didn't give, and a guest's log", async () => {
    const [member, guest] = [await signedIn("member"), await signedIn("guest")];

    const response = await apiRequest(
      server,
      `/users/${member.id}/log?before=yesterday`,
      { cookie: member.cookie },
    );
    await expectError(log, response, "invalid_request", {
      issues: [{ path: ["before"], code: "invalid_format" }],
    });
    await expectError(
      log,
      await apiRequest(server, `/users/${guest.id}/log`, {
        cookie: member.cookie,
      }),
      "not_found",
    );
  });
});

describe("GET /api/users/:userId/log/:entryId", () => {
  it("answers one entry as the log shows it, and not_found for another member's", async () => {
    const { member } = await memberWithLog();
    const other = await signedIn("member");
    const [entry] = (await readLog(member.cookie, member.id, "?limit=2"))
      .entries;

    const response = await apiRequest(
      server,
      `/users/${member.id}/log/${entry?.id}`,
      { cookie: other.cookie },
    );
    expect(response.status).toBe(200);
    expect(parseOutput(logEntry, await response.json())).toEqual(entry);

    await expectError(
      logEntry,
      await apiRequest(server, `/users/${other.id}/log/${entry?.id}`, {
        cookie: other.cookie,
      }),
      "not_found",
    );
  });
});

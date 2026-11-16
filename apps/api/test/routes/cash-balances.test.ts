import { randomUUID } from "node:crypto";
import { apiContract } from "@fpr/contracts";
import { createTestDatabase, type TestDatabase } from "@fpr/db/testing";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Auth } from "../../src/auth/auth.js";
import { expectError } from "../access-support.js";
import {
  addSignedIn,
  apiRequest,
  createTestAuth,
  parseOutput,
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

const signedIn = (role: "admin" | "member" | "guest") =>
  addSignedIn(server, test.db, auth, role);

const { setCash, updateCash, deleteCash, cashAt } = apiContract.portfolio;

function post(
  cookie: string,
  userId: string,
  body: Record<string, unknown>,
): Promise<Response> {
  return apiRequest(server, `/users/${userId}/cash-balances`, {
    method: "POST",
    cookie,
    body,
  });
}

describe("POST /api/users/:userId/cash-balances", () => {
  it("sets cash from a moment, made by the member", async () => {
    const member = await signedIn("member");

    const response = await post(member.cookie, member.id, {
      amountEur: "1250.50",
      effectiveAt: "2026-03-02T09:00:00+01:00",
    });

    expect(response.status).toBe(201);
    expect(parseOutput(setCash, await response.json())).toMatchObject({
      type: "cash",
      amountEur: "1250.50",
      effectiveAt: "2026-03-02T08:00:00.000Z",
      madeBy: { id: member.id, displayName: "Test member" },
    });
  });

  it("refuses a future moment, cash below zero, and another member's portfolio", async () => {
    const [member, other] = [
      await signedIn("member"),
      await signedIn("member"),
    ];
    const body = { amountEur: "10", effectiveAt: "2026-03-02T09:00:00Z" };

    await expectError(
      setCash,
      await post(member.cookie, member.id, {
        ...body,
        effectiveAt: new Date(Date.now() + 60_000).toISOString(),
      }),
      "future_moment",
    );
    const negative = await post(member.cookie, member.id, {
      ...body,
      amountEur: "-1",
    });
    expect(negative.status).toBe(400);
    await expectError(
      setCash,
      await post(member.cookie, other.id, body),
      "forbidden",
    );
  });

  it("saves a balance sent twice with its id once, and refuses another member's id", async () => {
    const [member, other] = [
      await signedIn("member"),
      await signedIn("member"),
    ];
    const body = {
      id: randomUUID(),
      amountEur: "30",
      effectiveAt: "2026-03-02T09:00:00Z",
    };

    const [first, second] = await Promise.all([
      post(member.cookie, member.id, body),
      post(member.cookie, member.id, body),
    ]);

    expect([first.status, second.status]).toEqual([201, 201]);
    expect(await second.json()).toEqual(await first.json());
    await expectError(
      setCash,
      await post(other.cookie, other.id, body),
      "forbidden",
    );
  });
});

describe("PATCH and DELETE /api/cash-balances/:id", () => {
  it("edits and deletes a member's own balance, refusing another member", async () => {
    const [member, other] = [
      await signedIn("member"),
      await signedIn("member"),
    ];
    const created = parseOutput(
      setCash,
      await (
        await post(member.cookie, member.id, {
          amountEur: "30",
          effectiveAt: "2026-03-02T09:00:00Z",
        })
      ).json(),
    );
    const path = `/cash-balances/${created.id}`;

    await expectError(
      updateCash,
      await apiRequest(server, path, {
        method: "PATCH",
        cookie: other.cookie,
        body: { amountEur: "1" },
      }),
      "forbidden",
    );
    await expectError(
      updateCash,
      await apiRequest(server, path, {
        method: "PATCH",
        cookie: member.cookie,
        body: { effectiveAt: new Date(Date.now() + 60_000).toISOString() },
      }),
      "future_moment",
    );

    const edit = await apiRequest(server, path, {
      method: "PATCH",
      cookie: member.cookie,
      body: { amountEur: "45.10" },
    });
    expect(edit.status).toBe(200);
    expect(parseOutput(updateCash, await edit.json())).toEqual({
      ...created,
      amountEur: "45.10",
    });

    const removal = await apiRequest(server, path, {
      method: "DELETE",
      cookie: member.cookie,
    });
    expect(removal.status).toBe(204);
    await expectError(
      deleteCash,
      await apiRequest(server, path, {
        method: "DELETE",
        cookie: member.cookie,
      }),
      "not_found",
    );
  });
});

describe("GET /api/users/:userId/cash-at", () => {
  it("answers the cash set at or before the moment, the one recorded last of two", async () => {
    const [member, guest] = [await signedIn("member"), await signedIn("guest")];
    const read = (userId: string, at: string) =>
      apiRequest(
        server,
        `/users/${userId}/cash-at?at=${encodeURIComponent(at)}`,
        { cookie: guest.cookie },
      );
    for (const amountEur of ["30", "40"]) {
      await post(member.cookie, member.id, {
        amountEur,
        effectiveAt: "2026-03-02T09:00:00Z",
      });
    }

    const before = await read(member.id, "2026-03-01T09:00:00Z");
    expect(before.status).toBe(200);
    expect(parseOutput(cashAt, await before.json())).toBeNull();

    const after = await read(member.id, "2026-03-05T09:00:00+01:00");
    expect(parseOutput(cashAt, await after.json())).toEqual({
      amountEur: "40",
      setAt: "2026-03-02T09:00:00.000Z",
    });

    await expectError(
      cashAt,
      await read(guest.id, "2026-03-05T09:00:00Z"),
      "not_found",
    );
  });
});

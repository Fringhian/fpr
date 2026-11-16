import { randomUUID } from "node:crypto";
import { type AdminPerson, apiContract, errorSchema } from "@fpr/contracts";
import { accessKeys, type Role, users } from "@fpr/db";
import { createTestDatabase, type TestDatabase } from "@fpr/db/testing";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Auth } from "../../src/auth/auth.js";
import { addKeyHolder, DAY_MS, post } from "../access-support.js";
import { addCashBalance } from "../admin-support.js";
import {
  addSignedIn,
  apiRequest,
  createTestAuth,
  parseOutput,
  pseudonymOf,
  serveApp,
  TEST_PUBLIC_URL,
  type TestServer,
} from "../test-support.js";

let test: TestDatabase;
let auth: Auth;
let server: TestServer;
let adminCookie: string;

beforeAll(async () => {
  test = await createTestDatabase();
  auth = createTestAuth(test.db);
  server = await serveApp({ db: test.db, auth });
  adminCookie = (await addSignedIn(server, test.db, auth, "admin")).cookie;
});

afterAll(async () => {
  await server.close();
  await test.drop();
});

async function listPeople(cookie = adminCookie): Promise<AdminPerson[]> {
  const response = await apiRequest(server, "/admin/people", { cookie });
  expect(response.status).toBe(200);
  return parseOutput(apiContract.admin.people, await response.json());
}

function addPerson(body: Record<string, unknown>): Promise<Response> {
  return apiRequest(server, "/admin/people", {
    method: "POST",
    cookie: adminCookie,
    body,
  });
}

async function errorCode(response: Response): Promise<string> {
  return errorSchema.parse(await response.json()).error.code;
}

describe("GET /api/admin/people", () => {
  it("lists every person with their role and access status", async () => {
    const past = new Date(Date.now() - DAY_MS);
    const holders = {
      waiting: await addKeyHolder(test.db, auth, "member"),
      active: await addKeyHolder(test.db, auth, "guest", {
        key: { claimed: true },
      }),
      expired: await addKeyHolder(test.db, auth, "member", {
        key: { claimBefore: past },
      }),
      revoked: await addKeyHolder(test.db, auth, "member", {
        key: { claimed: true, revoked: true },
      }),
      ended: await addKeyHolder(test.db, auth, "member", {
        key: { claimed: true, accessUntil: past },
      }),
    };
    await addCashBalance(test.db, holders.active.id);

    const people = await listPeople();

    for (const [status, holder] of Object.entries(holders)) {
      expect(people.find((person) => person.id === holder.id)).toMatchObject({
        email: holder.email,
        accessStatus: status,
      });
    }
    expect(people.find((p) => p.id === holders.active.id)).toMatchObject({
      role: "guest",
      hasPortfolioEntries: true,
    });
    expect(people.find((p) => p.id === holders.ended.id)?.accessUntil).toBe(
      past.toISOString(),
    );
  });

  it("lets an anonymous viewer read it, with pseudonyms and no emails or pictures", async () => {
    const viewer = await addSignedIn(server, test.db, auth, "anonymous");
    const member = await addKeyHolder(test.db, auth, "member");
    await users.update(test.db, member.id, { avatarKey: "avatars/a/b.webp" });

    const people = await listPeople(viewer.cookie);

    expect(people.length).toBeGreaterThan(2);
    for (const person of people) {
      expect(person.displayName).toBe(await pseudonymOf(test.db, person.id));
      expect(person.email).toBeNull();
      expect(person.avatarUrl).toBeNull();
    }
  });

  it.each(["member", "guest"] as const)("refuses a %s", async (role) => {
    const { cookie } = await addSignedIn(server, test.db, auth, role);

    const response = await apiRequest(server, "/admin/people", { cookie });

    expect(response.status).toBe(403);
  });
});

describe("POST /api/admin/people", () => {
  it("adds a person with the first free colour and a link to claim within 7 days, shown once", async () => {
    const taken = await users.colorsInUse(test.db);
    const free = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10].find(
      (c) => !taken.includes(c),
    );
    const accessUntil = new Date(Date.now() + 30 * DAY_MS).toISOString();
    const email = `Robin-${randomUUID()}@Example.com`;

    const response = await addPerson({
      displayName: "Robin",
      email,
      role: "member",
      accessUntil,
    });

    expect(response.status).toBe(201);
    const { person, accessLink } = parseOutput(
      apiContract.admin.addPerson,
      await response.json(),
    );
    expect(person).toMatchObject({
      displayName: "Robin",
      email: email.toLowerCase(),
      role: "member",
      color: free,
      accessStatus: "waiting",
      accessUntil,
      hasPortfolioEntries: false,
    });
    const claimIn = Date.parse(person.claimBefore) - Date.now();
    expect(Math.abs(claimIn - 7 * DAY_MS)).toBeLessThan(60_000);
    expect(accessLink.startsWith(`${TEST_PUBLIC_URL}/access/`)).toBe(true);
    const key = accessLink.slice(`${TEST_PUBLIC_URL}/access/`.length);
    const check = await post(server, "/access/check", { key });
    expect(await check.json()).toMatchObject({
      state: "waiting",
      email: email.toLowerCase(),
    });
    const stored = await accessKeys.findCurrent(test.db, person.id);
    expect(stored?.codeHash).not.toContain(key);
  });

  it("gives an anonymous viewer a generated email and no onboarding", async () => {
    const response = await addPerson({
      displayName: "Reviewer",
      role: "anonymous",
    });

    expect(response.status).toBe(201);
    const { person, accessLink } = parseOutput(
      apiContract.admin.addPerson,
      await response.json(),
    );
    expect(person).toMatchObject({
      role: "anonymous",
      email: null,
      accessUntil: null,
    });
    const stored = await users.findById(test.db, person.id);
    expect(stored?.email).toBe(`${person.id}@anonymous.invalid`);
    expect(stored?.onboardedAt).not.toBeNull();
    const key = accessLink.slice(`${TEST_PUBLIC_URL}/access/`.length);
    const signIn = await post(server, "/access/sign-in", { key });
    expect(signIn.status).toBe(204);
  });

  it("refuses an email another person has", async () => {
    const other = await addKeyHolder(test.db, auth, "member");

    const response = await addPerson({
      displayName: "Twin",
      email: other.email.toUpperCase(),
      role: "guest",
    });

    expect(response.status).toBe(409);
    expect(await errorCode(response)).toBe("email_taken");
  });

  it("refuses an access end date in the past", async () => {
    const response = await addPerson({
      displayName: "Late",
      email: `${randomUUID()}@example.com`,
      role: "member",
      accessUntil: new Date(Date.now() - 1000).toISOString(),
    });

    expect(response.status).toBe(400);
    expect(await errorCode(response)).toBe("invalid_request");
  });
});

describe("every admin write", () => {
  const id = randomUUID();
  const writes: { method: string; path: string; body?: unknown }[] = [
    {
      method: "POST",
      path: "/admin/people",
      body: { displayName: "X", role: "anonymous" },
    },
    {
      method: "PATCH",
      path: `/admin/people/${id}`,
      body: { displayName: "X" },
    },
    { method: "DELETE", path: `/admin/people/${id}` },
    { method: "POST", path: `/admin/people/${id}/revoke` },
    { method: "POST", path: `/admin/people/${id}/restore` },
    { method: "POST", path: `/admin/people/${id}/replace-link` },
    { method: "POST", path: `/admin/people/${id}/reset-key` },
  ];
  const roles: Role[] = ["member", "guest", "anonymous"];

  it.each(roles.flatMap((role) => writes.map((write) => ({ role, ...write }))))(
    "refuses a $role: $method $path",
    async ({ role, method, path, body }) => {
      const { cookie } = await addSignedIn(server, test.db, auth, role);

      const response = await apiRequest(server, path, { method, cookie, body });

      expect(response.status).toBe(403);
      expect(await errorCode(response)).toBe("forbidden");
    },
  );
});

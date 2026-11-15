import {
  adminAreaRoles,
  adminRoles,
  decimalSchema,
  errorMap,
  type InvalidRequestDetails,
  profileRoles,
  publicRoute,
  type Role,
  roles,
  signedInRoute,
  writerRoles,
} from "@fpr/contracts";
import { accessKeys } from "@fpr/db";
import { createTestDatabase, type TestDatabase } from "@fpr/db/testing";
import { implement } from "@orpc/server";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { z } from "zod";
import type { Auth } from "../src/auth.js";
import type { ApiContext } from "../src/orpc.js";
import { requestPipeline, signedIn } from "../src/pipeline.js";
import {
  addPerson,
  createTestAuth,
  serveApp,
  signIn,
  TEST_PUBLIC_URL,
  type TestPerson,
  type TestServer,
} from "./test-support.js";

const viewerSchema = z.object({ id: z.uuid(), role: z.string() });

/** One route of each kind the API declares, used only here. */
const testContract = {
  publicRead: publicRoute
    .route({ method: "GET", path: "/open" })
    .output(z.object({ signedIn: z.boolean() })),
  publicWrite: publicRoute
    .route({ method: "POST", path: "/open" })
    .output(z.object({ signedIn: z.boolean() })),
  read: signedInRoute(roles)
    .route({ method: "GET", path: "/race" })
    .output(viewerSchema),
  write: signedInRoute(roles)
    .route({ method: "POST", path: "/anything" })
    .output(viewerSchema),
  profile: signedInRoute(profileRoles)
    .route({ method: "PATCH", path: "/profile" })
    .input(z.object({ name: z.string().min(1) }))
    .output(viewerSchema),
  adminArea: signedInRoute(adminAreaRoles)
    .route({ method: "GET", path: "/admin-area" })
    .output(viewerSchema),
  adminWrite: signedInRoute(adminRoles)
    .route({ method: "POST", path: "/admin-area" })
    .output(viewerSchema),
  portfolioRead: signedInRoute(roles)
    .route({ method: "GET", path: "/users/{userId}/things" })
    .input(z.object({ userId: z.uuid() }))
    .output(viewerSchema),
  portfolioWrite: signedInRoute(writerRoles)
    .route({ method: "POST", path: "/users/{userId}/things" })
    .input(z.object({ userId: z.uuid(), amountEur: decimalSchema }))
    .output(viewerSchema)
    .errors(errorMap("invalid_request")),
};

const api = implement(testContract).$context<ApiContext>().use(requestPipeline);

const answerViewer = api.read.use(signedIn).handler(({ context }) => ({
  id: context.viewer.id,
  role: context.viewer.role,
}));

const testRouter = {
  publicRead: api.publicRead.handler(({ context }) => ({
    signedIn: context.viewer !== null,
  })),
  publicWrite: api.publicWrite.handler(({ context }) => ({
    signedIn: context.viewer !== null,
  })),
  read: answerViewer,
  write: api.write.use(signedIn).handler(({ context }) => context.viewer),
  profile: api.profile.use(signedIn).handler(({ context }) => context.viewer),
  adminArea: api.adminArea
    .use(signedIn)
    .handler(({ context }) => context.viewer),
  adminWrite: api.adminWrite
    .use(signedIn)
    .handler(({ context }) => context.viewer),
  portfolioRead: api.portfolioRead
    .use(signedIn)
    .handler(({ context }) => context.viewer),
  portfolioWrite: api.portfolioWrite
    .use(signedIn)
    .handler(({ context }) => context.viewer),
};

let test: TestDatabase;
let auth: Auth;
let server: TestServer;
const people = {} as Record<Role, TestPerson & { cookie: string }>;

beforeAll(async () => {
  test = await createTestDatabase();
  auth = createTestAuth(test.db);
  server = await serveApp({ db: test.db, auth, router: testRouter });
  for (const role of roles) {
    const person = await addPerson(test.db, auth, role);
    people[role] = { ...person, cookie: await signIn(server, person) };
  }
});

afterAll(async () => {
  await server.close();
  await test.drop();
});

interface Call {
  method?: string;
  cookie?: string;
  origin?: string | null;
  body?: unknown;
}

/** A request to `/api<path>`, from the instance's pages unless `origin` says otherwise. */
function call(
  path: string,
  { method = "GET", cookie, origin = TEST_PUBLIC_URL, body }: Call = {},
): Promise<Response> {
  const headers: Record<string, string> = {};
  if (cookie !== undefined) {
    headers.Cookie = cookie;
  }
  if (origin !== null) {
    headers.Origin = origin;
  }
  if (body !== undefined) {
    headers["Content-Type"] = "application/json";
  }
  return fetch(`${server.url}/api${path}`, {
    method,
    headers,
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
}

async function errorCode(response: Response): Promise<string> {
  const body = (await response.json()) as { error: { code: string } };
  return body.error.code;
}

async function sessionsOf(userId: string) {
  return test.db
    .selectFrom("session")
    .selectAll()
    .where("userId", "=", userId)
    .execute();
}

/** A person of their own, signed in, for a test that ends their access. */
async function signedInPerson(role: Role = "member") {
  const person = await addPerson(test.db, auth, role);
  return { ...person, cookie: await signIn(server, person) };
}

describe("session", () => {
  it("answers a signed-in route without a session with unauthenticated", async () => {
    const response = await call("/race");

    expect(response.status).toBe(401);
    expect(await errorCode(response)).toBe("unauthenticated");
  });

  it("answers a cookie that names no session with unauthenticated", async () => {
    const response = await call("/race", {
      cookie: "__Secure-better-auth.session_token=not-a-session.signature",
    });

    expect(response.status).toBe(401);
    expect(await errorCode(response)).toBe("unauthenticated");
  });

  it("gives the handler the signed-in person from the session cookie", async () => {
    const response = await call("/race", { cookie: people.member.cookie });

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      id: people.member.id,
      role: "member",
    });
  });

  it("extends a session in use to 30 days, with a renewed cookie", async () => {
    const person = await signedInPerson();
    const inTwentyEightDays = new Date(Date.now() + 28 * 24 * 60 * 60 * 1000);
    await test.db
      .updateTable("session")
      .set({ expiresAt: inTwentyEightDays })
      .where("userId", "=", person.id)
      .execute();

    const response = await call("/race", { cookie: person.cookie });

    expect(response.status).toBe(200);
    const [session] = await sessionsOf(person.id);
    const thirtyDays = 30 * 24 * 60 * 60 * 1000;
    expect(session?.expiresAt.getTime()).toBeGreaterThan(
      Date.now() + thirtyDays - 60_000,
    );
    expect(
      response.headers
        .getSetCookie()
        .some((line) => line.startsWith("__Secure-better-auth.session_token=")),
    ).toBe(true);
  });

  it("logs the signed-in person's id on the request line", async () => {
    await call("/race", { cookie: people.guest.cookie });

    const line = server
      .lines()
      .findLast((entry) => entry.message === "request completed");
    expect(line).toMatchObject({ userId: people.guest.id });
  });
});

describe("public routes", () => {
  it("answer without a session", async () => {
    const response = await call("/open");

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ signedIn: false });
  });

  it("skip the access check: a session whose access ended is kept", async () => {
    const person = await signedInPerson();
    await accessKeys.revoke(test.db, person.keyId);

    const response = await call("/open", {
      method: "POST",
      cookie: person.cookie,
    });

    expect(response.status).toBe(200);
    expect(await sessionsOf(person.id)).toHaveLength(1);
  });
});

describe("origin check", () => {
  it.each([
    ["from another origin", "https://elsewhere.example.test"],
    ["from PUBLIC_URL on another port", "https://fpr.example.test:8443"],
    ["without an Origin", null],
    ["from an opaque origin", "null"],
  ])("refuses a write %s with forbidden", async (_, origin) => {
    const publicWrite = await call("/open", { method: "POST", origin });
    const signedInWrite = await call("/admin-area", {
      method: "POST",
      cookie: people.admin.cookie,
      origin,
    });

    expect(publicWrite.status).toBe(403);
    expect(await errorCode(publicWrite)).toBe("forbidden");
    expect(signedInWrite.status).toBe(403);
    expect(await errorCode(signedInWrite)).toBe("forbidden");
  });

  it("accepts a write from PUBLIC_URL", async () => {
    const response = await call("/open", { method: "POST" });

    expect(response.status).toBe(200);
  });

  it("leaves reads to any origin", async () => {
    const response = await call("/race", {
      cookie: people.member.cookie,
      origin: "https://elsewhere.example.test",
    });

    expect(response.status).toBe(200);
  });
});

describe("access check", () => {
  const past = () => new Date(Date.now() - 60_000);
  const ended: [string, (person: TestPerson) => Promise<unknown>][] = [
    ["revoked", (person) => accessKeys.revoke(test.db, person.keyId)],
    [
      "past its end date",
      (person) => accessKeys.setAccessUntil(test.db, person.keyId, past()),
    ],
    [
      "replaced, with the new link not used yet",
      async (person) => {
        await accessKeys.revoke(test.db, person.keyId);
        await accessKeys.insert(test.db, {
          userId: person.id,
          codeHash: `replacement-${person.id}`,
          claimedAt: null,
          accessUntil: null,
          revokedAt: null,
          createdBy: null,
        });
      },
    ],
  ];

  it.each(ended)(
    "with access %s, deletes every session of the person and answers access_ended",
    async (_, endAccess) => {
      const person = await signedInPerson();
      await signIn(server, person);
      await endAccess(person);

      const response = await call("/race", { cookie: person.cookie });

      expect(response.status).toBe(401);
      expect(await errorCode(response)).toBe("access_ended");
      expect(await sessionsOf(person.id)).toEqual([]);
      const next = await call("/race", { cookie: person.cookie });
      expect(await errorCode(next)).toBe("unauthenticated");
    },
  );

  it.each(["admin", "member", "guest", "anonymous"] as const)(
    "applies to a signed-in %s",
    async (role) => {
      const person = await signedInPerson(role);
      await accessKeys.revoke(test.db, person.keyId);

      const response = await call("/race", { cookie: person.cookie });

      expect(await errorCode(response)).toBe("access_ended");
    },
  );

  it("keeps a person whose access ends in the future, or was restored", async () => {
    const person = await signedInPerson();
    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
    await accessKeys.setAccessUntil(test.db, person.keyId, tomorrow);
    await accessKeys.revoke(test.db, person.keyId);
    await accessKeys.restore(test.db, person.keyId);

    const response = await call("/race", { cookie: person.cookie });

    expect(response.status).toBe(200);
    expect(await sessionsOf(person.id)).toHaveLength(1);
  });

  it("comes before the role guard and input validation", async () => {
    const person = await signedInPerson("guest");
    await accessKeys.revoke(test.db, person.keyId);

    const response = await call("/admin-area", {
      method: "POST",
      cookie: person.cookie,
    });

    expect(await errorCode(response)).toBe("access_ended");
  });
});

describe("role guard", () => {
  type Expected = Record<Role, 200 | 403>;
  const routes: [string, Call & { path: string }, Expected][] = [
    [
      "a read for every role",
      { path: "/race" },
      { admin: 200, member: 200, guest: 200, anonymous: 200 },
    ],
    [
      "a write every role is listed for",
      { path: "/anything", method: "POST" },
      { admin: 200, member: 200, guest: 200, anonymous: 403 },
    ],
    [
      "a write to the person's own profile",
      { path: "/profile", method: "PATCH", body: { name: "Kim" } },
      { admin: 200, member: 200, guest: 200, anonymous: 403 },
    ],
    [
      "the admin area's reads",
      { path: "/admin-area" },
      { admin: 200, member: 403, guest: 403, anonymous: 200 },
    ],
    [
      "the admin area's writes",
      { path: "/admin-area", method: "POST" },
      { admin: 200, member: 403, guest: 403, anonymous: 403 },
    ],
  ];

  describe.each(routes)("%s", (_, { path, ...init }, expected) => {
    it.each(roles)("answers a signed-in %s as listed", async (role) => {
      const response = await call(path, {
        ...init,
        cookie: people[role].cookie,
      });

      expect(response.status).toBe(expected[role]);
      if (expected[role] === 403) {
        expect(await errorCode(response)).toBe("forbidden");
      }
    });
  });

  describe("a {userId} write", () => {
    const write = (role: Role, userId: string, body: unknown) =>
      call(`/users/${userId}/things`, {
        method: "POST",
        cookie: people[role].cookie,
        body,
      });
    const valid = { amountEur: "12.50" };

    it("lets a member write their own data", async () => {
      const response = await write("member", people.member.id, valid);

      expect(response.status).toBe(200);
    });

    it("lets a member write their own data with their id in capitals", async () => {
      const response = await write(
        "member",
        people.member.id.toUpperCase(),
        valid,
      );

      expect(response.status).toBe(200);
    });

    it("refuses a member another member's data with forbidden, before reading the body", async () => {
      const response = await write("member", people.admin.id, {});

      expect(response.status).toBe(403);
      expect(await errorCode(response)).toBe("forbidden");
    });

    it("ignores a userId in the body, which the path's replaces", async () => {
      const response = await write("member", people.admin.id, {
        ...valid,
        userId: people.member.id,
      });

      expect(response.status).toBe(403);
    });

    it("lets the admin write anyone's data", async () => {
      const response = await write("admin", people.member.id, valid);

      expect(response.status).toBe(200);
      expect(await response.json()).toEqual({
        id: people.admin.id,
        role: "admin",
      });
    });

    it.each(["guest", "anonymous"] as const)(
      "refuses a %s even their own id",
      async (role) => {
        const response = await write(role, people[role].id, valid);

        expect(response.status).toBe(403);
      },
    );

    it("lets every role read anyone's data", async () => {
      for (const role of roles) {
        const response = await call(`/users/${people.admin.id}/things`, {
          cookie: people[role].cookie,
        });
        expect(response.status).toBe(200);
      }
    });
  });
});

describe("input validation", () => {
  it("answers a body that fails its contract with invalid_request and the field errors", async () => {
    const response = await call(`/users/${people.member.id}/things`, {
      method: "POST",
      cookie: people.member.cookie,
      body: { amountEur: 12.5 },
    });
    const body = (await response.json()) as {
      error: { code: string; details: InvalidRequestDetails };
    };

    expect(response.status).toBe(400);
    expect(body).toEqual({
      error: {
        code: "invalid_request",
        details: { issues: [{ path: ["amountEur"], code: "invalid_type" }] },
      },
    });
  });

  it("answers an invalid path parameter with invalid_request for the admin", async () => {
    const response = await call("/users/not-a-uuid/things", {
      method: "POST",
      cookie: people.admin.cookie,
      body: { amountEur: "1" },
    });

    expect(response.status).toBe(400);
    expect(await errorCode(response)).toBe("invalid_request");
  });

  it("comes after the session: without one, the answer is unauthenticated", async () => {
    const response = await call("/profile", {
      method: "PATCH",
      body: { name: "" },
    });

    expect(await errorCode(response)).toBe("unauthenticated");
  });
});

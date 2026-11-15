import { Writable } from "node:stream";
import { accessKeys, users } from "@fpr/db";
import { createTestDatabase, type TestDatabase } from "@fpr/db/testing";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  type Auth,
  authSchema,
  createAuth,
  passwordLength,
  sessionMaxAgeSeconds,
  signInRateLimit,
} from "./auth.js";
import { createLogger } from "./logger.js";
import {
  addPerson,
  cookieFrom,
  createTestAuth,
  newClientAddress,
  postSignIn,
  serveApp,
  signIn,
  TEST_PASSWORD,
  TEST_PUBLIC_URL,
  type TestServer,
} from "./test-support.js";

const UUID_V7 =
  /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

/** Every person is added by the admin. */
const ADDED_BY_ADMIN = { method: "admin" } as const;

const SESSION_COOKIE = "__Secure-better-auth.session_token";

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

/** A request to Better Auth's endpoint at `path`, from the instance's pages. */
function authRequest(
  path: string,
  init: { body?: unknown; cookie?: string; origin?: string } = {},
): Promise<Response> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "X-Forwarded-For": newClientAddress(),
    Origin: init.origin ?? TEST_PUBLIC_URL,
  };
  if (init.cookie !== undefined) {
    headers.Cookie = init.cookie;
  }
  return fetch(`${server.url}/api/auth${path}`, {
    method: init.body === undefined && path === "/get-session" ? "GET" : "POST",
    headers,
    ...(init.body === undefined ? {} : { body: JSON.stringify(init.body) }),
  });
}

async function sessionCount(userId: string): Promise<number> {
  const rows = await test.db
    .selectFrom("session")
    .select("id")
    .where("userId", "=", userId)
    .execute();
  return rows.length;
}

describe("Better Auth on FPR's tables", () => {
  it("creates a person whose id Postgres generates, with FPR's columns", async () => {
    const context = await auth.$context;
    const created = await context.internalAdapter.createUser(
      {
        email: "Alex@Example.com",
        name: "Alex",
        emailVerified: false,
        role: "member",
        color: 3,
      },
      ADDED_BY_ADMIN,
    );

    expect(created.id).toMatch(UUID_V7);
    const row = await users.findById(test.db, created.id);
    expect(row).toMatchObject({
      email: "alex@example.com",
      displayName: "Alex",
      role: "member",
      color: 3,
      avatarKey: null,
      locale: null,
      onboardedAt: null,
    });
  });

  it("declares FPR's columns on user as additional fields no endpoint takes as input", () => {
    expect(
      Object.entries(authSchema.user.additionalFields).map(
        ([name, field]) => [name, field.input] as const,
      ),
    ).toEqual([
      ["role", false],
      ["color", false],
      ["locale", false],
      ["onboardedAt", false],
    ]);
  });

  it("signs a person in with a password, in a session of theirs with FPR's columns", async () => {
    const person = await addPerson(test.db, auth, "admin");

    const { token, user } = await auth.api.signInEmail({
      body: { email: person.email, password: TEST_PASSWORD },
    });

    expect(user).toMatchObject({ id: person.id, role: "admin", color: 1 });
    const session = await test.db
      .selectFrom("session")
      .selectAll()
      .where("token", "=", token)
      .executeTakeFirstOrThrow();
    expect(session.id).toMatch(UUID_V7);
    expect(session.userId).toBe(person.id);
    const account = await test.db
      .selectFrom("account")
      .selectAll()
      .where("userId", "=", person.id)
      .executeTakeFirstOrThrow();
    expect(account.id).toMatch(UUID_V7);
    expect(account.providerId).toBe("credential");
  });
});

describe("/api/auth", () => {
  it("signs in with an email and password, in an HTTP-only, Secure, SameSite=Lax cookie that lasts 30 days", async () => {
    const person = await addPerson(test.db, auth, "member");

    const response = await postSignIn(server, person.email, TEST_PASSWORD);

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      user: { id: person.id, email: person.email },
    });
    const cookie = response.headers
      .getSetCookie()
      .find((line) => line.startsWith(`${SESSION_COOKIE}=`));
    expect(cookie).toBeDefined();
    const attributes = (cookie ?? "")
      .split(";")
      .slice(1)
      .map((part) => part.trim().toLowerCase());
    expect(attributes).toEqual(
      expect.arrayContaining([
        "httponly",
        "secure",
        "samesite=lax",
        "path=/",
        `max-age=${sessionMaxAgeSeconds}`,
      ]),
    );
    expect(await sessionCount(person.id)).toBe(1);
  });

  it("refuses a wrong password with 401, without a session", async () => {
    const person = await addPerson(test.db, auth, "member");

    const response = await postSignIn(
      server,
      person.email,
      "not the right password",
    );

    expect(response.status).toBe(401);
    expect(response.headers.getSetCookie()).toEqual([]);
    expect(await sessionCount(person.id)).toBe(0);
  });

  it("refuses an unknown email as it refuses a wrong password", async () => {
    const response = await postSignIn(
      server,
      "nobody@example.com",
      TEST_PASSWORD,
    );

    expect(response.status).toBe(401);
  });

  it("signs out: the session is deleted and its cookie cleared", async () => {
    const person = await addPerson(test.db, auth, "member");
    const cookie = await signIn(server, person);

    const response = await authRequest("/sign-out", { body: {}, cookie });

    expect(response.status).toBe(200);
    expect(
      response.headers
        .getSetCookie()
        .some(
          (line) =>
            line.startsWith(`${SESSION_COOKIE}=;`) && /Max-Age=0/i.test(line),
        ),
    ).toBe(true);
    expect(await sessionCount(person.id)).toBe(0);
    const session = await authRequest("/get-session", { cookie });
    expect(await session.json()).toBeNull();
  });

  it("refuses sign-up, and adds nobody", async () => {
    const response = await authRequest("/sign-up/email", {
      body: {
        email: "kim@example.com",
        password: "a long enough password",
        name: "Kim",
      },
    });

    expect(response.status).toBe(400);
    expect(await users.findByEmail(test.db, "kim@example.com")).toBeUndefined();
    await expect(
      auth.api.signUpEmail({
        body: {
          email: "kim@example.com",
          password: "a long enough password",
          name: "Kim",
        },
      }),
    ).rejects.toThrow();
  });

  it("has no user-update endpoint", async () => {
    const person = await addPerson(test.db, auth, "member");
    const cookie = await signIn(server, person);

    const response = await authRequest("/update-user", {
      body: { name: "Someone else", role: "admin" },
      cookie,
    });

    expect(response.status).toBe(404);
    expect(await users.findById(test.db, person.id)).toMatchObject({
      displayName: "Test member",
      role: "member",
    });
  });

  it("refuses a sign-in for a person whose access ended, with access_ended", async () => {
    const person = await addPerson(test.db, auth, "member");
    await accessKeys.revoke(test.db, person.keyId);

    const response = await postSignIn(server, person.email, TEST_PASSWORD);

    expect(response.status).toBe(401);
    expect(await response.json()).toMatchObject({ code: "access_ended" });
    expect(response.headers.getSetCookie()).toEqual([]);
    expect(await sessionCount(person.id)).toBe(0);
  });

  it("does not say whether access ended to a wrong password", async () => {
    const person = await addPerson(test.db, auth, "member");
    await accessKeys.revoke(test.db, person.keyId);

    const response = await postSignIn(
      server,
      person.email,
      "not the right password",
    );

    expect(response.status).toBe(401);
    expect(await response.json()).not.toMatchObject({ code: "access_ended" });
  });

  it(`refuses a password under ${passwordLength.min} or over ${passwordLength.max} characters`, async () => {
    const person = await addPerson(test.db, auth, "member");
    const cookie = await signIn(server, person);

    for (const newPassword of [
      "a".repeat(passwordLength.min - 1),
      "a".repeat(passwordLength.max + 1),
    ]) {
      const response = await authRequest("/change-password", {
        body: { currentPassword: TEST_PASSWORD, newPassword },
        cookie,
      });
      expect(response.status).toBe(400);
    }
    const accepted = await authRequest("/change-password", {
      body: {
        currentPassword: TEST_PASSWORD,
        newPassword: "b".repeat(passwordLength.min),
      },
      cookie,
    });
    expect(accepted.status).toBe(200);
  });
});

describe("logging", () => {
  it("writes Better Auth's warnings as pino lines", async () => {
    const lines: string[] = [];
    const logged = createAuth({
      db: test.db,
      secret: "a-test-secret-of-at-least-thirty-two-characters",
      baseURL: TEST_PUBLIC_URL,
      logger: createLogger({
        destination: new Writable({
          write(chunk, _encoding, callback) {
            lines.push(chunk.toString());
            callback();
          },
        }),
      }),
    });
    const person = await addPerson(test.db, logged, "member");

    await expect(
      logged.api.signInEmail({
        body: { email: person.email, password: "not the right password" },
      }),
    ).rejects.toThrow();

    expect(lines.map((line) => JSON.parse(line))).toContainEqual(
      expect.objectContaining({
        level: "warn",
        service: "api",
        message: "Invalid password",
      }),
    );
  });
});

describe("origin check", () => {
  it("refuses a write with a session from another origin", async () => {
    const person = await addPerson(test.db, auth, "member");
    const cookie = await signIn(server, person);

    const response = await authRequest("/sign-out", {
      body: {},
      cookie,
      origin: "https://elsewhere.example.test",
    });

    expect(response.status).toBe(403);
    expect(await sessionCount(person.id)).toBe(1);
  });

  it("refuses a sign-in posted by another site's page", async () => {
    const person = await addPerson(test.db, auth, "member");

    const response = await fetch(`${server.url}/api/auth/sign-in/email`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Origin: "https://elsewhere.example.test",
        "Sec-Fetch-Site": "cross-site",
        "Sec-Fetch-Mode": "navigate",
        "Sec-Fetch-Dest": "document",
        "X-Forwarded-For": newClientAddress(),
      },
      body: JSON.stringify({ email: person.email, password: TEST_PASSWORD }),
    });

    expect(response.status).toBe(403);
    expect(await sessionCount(person.id)).toBe(0);
  });
});

describe("rate limit", () => {
  it(`refuses a client address's sign-in once it has tried ${signInRateLimit.max} in ${signInRateLimit.window} seconds, and only that address`, async () => {
    const person = await addPerson(test.db, auth, "member");
    const address = newClientAddress();

    for (let attempt = 0; attempt < signInRateLimit.max; attempt += 1) {
      const response = await postSignIn(
        server,
        person.email,
        "not the right password",
        address,
      );
      expect(response.status).toBe(401);
    }
    const limited = await postSignIn(
      server,
      person.email,
      TEST_PASSWORD,
      address,
    );
    const elsewhere = await postSignIn(server, person.email, TEST_PASSWORD);

    expect(limited.status).toBe(429);
    expect(elsewhere.status).toBe(200);
    expect(cookieFrom(elsewhere)).toContain(SESSION_COOKIE);
  });
});

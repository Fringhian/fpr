import { users } from "@fpr/db";
import { createTestDatabase, type TestDatabase } from "@fpr/db/testing";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { type Auth, createAuth } from "./auth.js";

const UUID_V7 =
  /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

/** Every person is added by the admin. */
const ADDED_BY_ADMIN = { method: "admin" } as const;

let test: TestDatabase;
let auth: Auth;

beforeAll(async () => {
  test = await createTestDatabase();
  auth = createAuth({
    db: test.db,
    secret: "a-test-secret-that-is-long-enough-for-better-auth",
    baseURL: "http://localhost:5173",
  });
});

afterAll(async () => {
  await test.drop();
});

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

  it("signs a person in with a password, in a session of theirs", async () => {
    const context = await auth.$context;
    const person = await context.internalAdapter.createUser(
      {
        email: "sam@example.com",
        name: "Sam",
        emailVerified: false,
        role: "admin",
        color: 4,
      },
      ADDED_BY_ADMIN,
    );
    await context.internalAdapter.linkAccount({
      accountId: person.id,
      providerId: "credential",
      userId: person.id,
      password: await context.password.hash("a long enough password"),
    });

    const { token, user } = await auth.api.signInEmail({
      body: { email: "sam@example.com", password: "a long enough password" },
    });

    expect(user).toMatchObject({ id: person.id, name: "Sam", role: "admin" });
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

  it("has no user-update endpoint", async () => {
    const response = await auth.handler(
      new Request("http://localhost:5173/api/auth/update-user", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name: "Someone else", image: "other/key" }),
      }),
    );
    expect(response.status).toBe(404);
  });

  it("refuses public sign-up", async () => {
    await expect(
      auth.api.signUpEmail({
        body: {
          email: "kim@example.com",
          password: "a long enough password",
          name: "Kim",
        },
      }),
    ).rejects.toThrow();
    expect(await users.findByEmail(test.db, "kim@example.com")).toBeUndefined();
  });
});

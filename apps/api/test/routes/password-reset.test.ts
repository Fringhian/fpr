import { apiContract } from "@fpr/contracts";
import { createTestDatabase, type TestDatabase } from "@fpr/db/testing";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { newKey } from "../../src/access/keys.js";
import type { Auth } from "../../src/auth.js";
import { publicWriteRateLimit } from "../../src/pipeline/index.js";
import {
  addKeyHolder,
  addResetKey,
  exhaustRateLimit,
  expectError,
  post,
} from "../access-support.js";
import {
  createTestAuth,
  postSignIn,
  serveApp,
  signIn,
  TEST_PASSWORD,
  type TestServer,
} from "../test-support.js";

const route = apiContract.access.reset;

const NEW_PASSWORD = "a password I will remember";

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

/** A password user with a usable reset key. */
async function personWithResetKey() {
  const person = await addKeyHolder(test.db, auth, "member", {
    withPassword: true,
    key: { claimed: true },
  });
  return { ...person, resetKey: await addResetKey(test.db, person.id) };
}

function reset(email: string, key: string, password = NEW_PASSWORD) {
  return post(server, "/password-reset", { email, key, password });
}

async function sessionCount(userId: string): Promise<number> {
  const rows = await test.db
    .selectFrom("session")
    .select("id")
    .where("userId", "=", userId)
    .execute();
  return rows.length;
}

async function usedAt(userId: string): Promise<Date | null | undefined> {
  const row = await test.db
    .selectFrom("resetKeys")
    .select("usedAt")
    .where("userId", "=", userId)
    .executeTakeFirst();
  return row?.usedAt;
}

describe("POST /api/password-reset", () => {
  it("sets the password, uses the key, and ends every session", async () => {
    const person = await personWithResetKey();
    const cookie = await signIn(server, { ...person, keyId: person.keyId });
    expect(await sessionCount(person.id)).toBe(1);

    const response = await reset(person.email, person.resetKey);

    expect(response.status).toBe(204);
    expect(await response.text()).toBe("");
    expect(await sessionCount(person.id)).toBe(0);
    expect(await usedAt(person.id)).toBeInstanceOf(Date);
    const session = await fetch(`${server.url}/api/auth/get-session`, {
      headers: { Cookie: cookie },
    });
    expect(await session.json()).toBeNull();
    expect((await postSignIn(server, person.email, TEST_PASSWORD)).status).toBe(
      401,
    );
    expect((await postSignIn(server, person.email, NEW_PASSWORD)).status).toBe(
      200,
    );
  });

  it("works once", async () => {
    const person = await personWithResetKey();
    expect((await reset(person.email, person.resetKey)).status).toBe(204);

    const again = await reset(
      person.email,
      person.resetKey,
      "yet another new password",
    );

    await expectError(route, again, "invalid_reset_key");
    expect((await postSignIn(server, person.email, NEW_PASSWORD)).status).toBe(
      200,
    );
  });

  it("works once when sent twice at once", async () => {
    const person = await personWithResetKey();

    const responses = await Promise.all([
      reset(person.email, person.resetKey),
      reset(person.email, person.resetKey, "a competing new password"),
    ]);

    expect(responses.map((response) => response.status).sort()).toEqual([
      204, 422,
    ]);
  });

  it("refuses a key past its 24 hours, keeping the password", async () => {
    const person = await addKeyHolder(test.db, auth, "member", {
      withPassword: true,
      key: { claimed: true },
    });
    const resetKey = await addResetKey(test.db, person.id, {
      expiresAt: new Date(Date.now() - 1000),
    });

    await expectError(
      route,
      await reset(person.email, resetKey),
      "invalid_reset_key",
    );
    expect((await postSignIn(server, person.email, TEST_PASSWORD)).status).toBe(
      200,
    );
  });

  it("gives one generic error for a wrong email or a wrong key, changing nothing", async () => {
    const person = await personWithResetKey();
    const other = await personWithResetKey();

    const responses = [
      await reset(other.email, person.resetKey),
      await reset(person.email, newKey().key),
      await reset(person.email, other.resetKey),
    ];

    for (const response of responses) {
      await expectError(route, response, "invalid_reset_key");
    }
    expect(await usedAt(person.id)).toBeNull();
    expect(await usedAt(other.id)).toBeNull();
  });

  it("refuses a password under 12 characters", async () => {
    const person = await personWithResetKey();

    await expectError(
      route,
      await reset(person.email, person.resetKey, "too short"),
      "invalid_request",
      { issues: [{ path: ["password"], code: "too_small" }] },
    );
    expect(await usedAt(person.id)).toBeNull();
  });

  it("is rate-limited per client address", async () => {
    const person = await personWithResetKey();
    const last = await exhaustRateLimit(
      (address) =>
        post(
          server,
          "/password-reset",
          { email: person.email, key: newKey().key, password: NEW_PASSWORD },
          { address },
        ),
      publicWriteRateLimit.max,
    );

    await expectError(route, last, "rate_limited");
    expect((await reset(person.email, person.resetKey)).status).toBe(204);
  });
});

import { apiContract } from "@fpr/contracts";
import { accessKeys, accounts } from "@fpr/db";
import { createTestDatabase, type TestDatabase } from "@fpr/db/testing";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { newKey } from "../../src/access/keys.js";
import type { Auth } from "../../src/auth.js";
import { publicWriteRateLimit } from "../../src/pipeline/index.js";
import {
  addKeyHolder,
  DAY_MS,
  exhaustRateLimit,
  expectError,
  expectSession,
  parseOutput,
  post,
  replaceKey,
  SESSION_COOKIE,
} from "../access-support.js";
import {
  createTestAuth,
  postSignIn,
  serveApp,
  TEST_PASSWORD,
  type TestServer,
} from "../test-support.js";

const route = apiContract.access.claim;

const NEW_PASSWORD = "my brand new password";

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

async function signInStatus(email: string, password: string) {
  return (await postSignIn(server, email, password)).status;
}

function claim(key: string, password?: string) {
  return post(server, "/access/claim", {
    key,
    ...(password === undefined ? {} : { password }),
  });
}

describe("POST /api/access/claim", () => {
  it("sets the password, claims the key, and starts a session", async () => {
    const person = await addKeyHolder(test.db, auth, "member");

    const response = await claim(person.key, NEW_PASSWORD);

    expect(response.status).toBe(200);
    expect(await parseOutput(route, response.clone())).toEqual({
      signedIn: true,
    });
    const session = await expectSession(server, response);
    expect(session).toMatchObject({ id: person.id, role: "member" });
    const key = await accessKeys.findCurrent(test.db, person.id);
    expect(key?.claimedAt).toBeInstanceOf(Date);
    expect(await signInStatus(person.email, NEW_PASSWORD)).toBe(200);
  });

  it("refuses the key once claimed", async () => {
    const person = await addKeyHolder(test.db, auth, "member");
    expect((await claim(person.key, NEW_PASSWORD)).status).toBe(200);

    const again = await claim(person.key, "another new password");

    await expectError(route, again, "invalid_access_key", {
      state: "claimed",
    });
    expect(await signInStatus(person.email, NEW_PASSWORD)).toBe(200);
  });

  it("claims a replaced link of a person with a password without the password step", async () => {
    const person = await addKeyHolder(test.db, auth, "member", {
      withPassword: true,
      key: { claimed: true },
    });
    const replaced = await replaceKey(test.db, person);

    const response = await claim(replaced.key);

    expect(response.status).toBe(200);
    expect(await parseOutput(route, response.clone())).toEqual({
      signedIn: false,
    });
    expect(response.headers.get("set-cookie") ?? "").not.toContain(
      SESSION_COOKIE,
    );
    expect(await accessKeys.hasAccess(test.db, person.id)).toBe(true);
    expect(await signInStatus(person.email, TEST_PASSWORD)).toBe(200);
  });

  it("refuses a password from a person who already has one", async () => {
    const person = await addKeyHolder(test.db, auth, "member", {
      withPassword: true,
    });

    const response = await claim(person.key, NEW_PASSWORD);

    await expectError(route, response, "invalid_request", {
      issues: [{ path: ["password"], code: "unrecognized_keys" }],
    });
    const key = await accessKeys.findCurrent(test.db, person.id);
    expect(key?.claimedAt).toBeNull();
  });

  it("asks for a password from a person who has none", async () => {
    const person = await addKeyHolder(test.db, auth, "member");

    const response = await claim(person.key);

    await expectError(route, response, "invalid_request", {
      issues: [{ path: ["password"], code: "invalid_type" }],
    });
    expect(await accounts.hasPassword(test.db, person.id)).toBe(false);
  });

  it("refuses a password under 12 characters", async () => {
    const person = await addKeyHolder(test.db, auth, "member");

    const response = await claim(person.key, "too short");

    await expectError(route, response, "invalid_request", {
      issues: [{ path: ["password"], code: "too_small" }],
    });
  });

  it.each([
    ["expired", { claimBefore: new Date(Date.now() - DAY_MS) }],
    ["revoked", { revoked: true }],
    ["ended", { accessUntil: new Date(Date.now() - DAY_MS) }],
  ] as const)("refuses an %s key with its state", async (state, key) => {
    const person = await addKeyHolder(test.db, auth, "member", { key });

    const response = await claim(person.key, NEW_PASSWORD);

    await expectError(route, response, "invalid_access_key", { state });
    expect(await accounts.hasPassword(test.db, person.id)).toBe(false);
  });

  it("refuses a replaced key", async () => {
    const person = await addKeyHolder(test.db, auth, "member");
    await replaceKey(test.db, person);

    const response = await claim(person.key, NEW_PASSWORD);

    await expectError(route, response, "invalid_access_key", {
      state: "replaced",
    });
  });

  it("refuses an unknown key", async () => {
    const response = await claim(newKey().key, NEW_PASSWORD);

    await expectError(route, response, "invalid_access_key", {
      state: "unknown",
    });
  });

  it("refuses an anonymous viewer's key", async () => {
    const viewer = await addKeyHolder(test.db, auth, "anonymous");

    const response = await claim(viewer.key, NEW_PASSWORD);

    await expectError(route, response, "invalid_access_key", {
      state: "waiting",
    });
    expect(await accounts.hasPassword(test.db, viewer.id)).toBe(false);
  });

  it("claims a key once when claimed twice at once", async () => {
    const person = await addKeyHolder(test.db, auth, "member");

    const responses = await Promise.all([
      claim(person.key, NEW_PASSWORD),
      claim(person.key, "a competing new password"),
    ]);

    expect(responses.map((response) => response.status).sort()).toEqual([
      200, 422,
    ]);
  });

  it("is rate-limited per client address", async () => {
    const { key } = newKey();
    const last = await exhaustRateLimit(
      (address) =>
        post(
          server,
          "/access/claim",
          { key, password: NEW_PASSWORD },
          { address },
        ),
      publicWriteRateLimit.max,
    );

    await expectError(route, last, "rate_limited");
    const otherAddress = await claim(key, NEW_PASSWORD);
    await expectError(route, otherAddress, "invalid_access_key", {
      state: "unknown",
    });
  });

  it("is not rate-limited without a client address, and logs it", async () => {
    const { key } = newKey();
    for (let count = 0; count <= publicWriteRateLimit.max; count += 1) {
      const response = await post(
        server,
        "/access/claim",
        { key, password: NEW_PASSWORD },
        { address: null },
      );
      await expectError(route, response, "invalid_access_key", {
        state: "unknown",
      });
    }
    expect(
      server
        .lines()
        .some(
          (line) =>
            line.level === "error" &&
            String(line.message).startsWith("rate limit skipped"),
        ),
    ).toBe(true);
  });
});

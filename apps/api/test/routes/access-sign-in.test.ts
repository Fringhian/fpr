import { apiContract } from "@fpr/contracts";
import { accessKeys } from "@fpr/db";
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
  post,
  replaceKey,
} from "../access-support.js";
import { createTestAuth, serveApp, type TestServer } from "../test-support.js";

const route = apiContract.access.signIn;

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

function signIn(key: string) {
  return post(server, "/access/sign-in", { key });
}

describe("POST /api/access/sign-in", () => {
  it("claims an anonymous viewer's key on the first visit and starts a session", async () => {
    const viewer = await addKeyHolder(test.db, auth, "anonymous");

    const response = await signIn(viewer.key);

    expect(response.status).toBe(204);
    expect(await response.clone().text()).toBe("");
    const session = await expectSession(server, response);
    expect(session).toMatchObject({ id: viewer.id, role: "anonymous" });
    const key = await accessKeys.findCurrent(test.db, viewer.id);
    expect(key?.claimedAt).toBeInstanceOf(Date);
  });

  it("works every time until access ends, keeping the first visit", async () => {
    const viewer = await addKeyHolder(test.db, auth, "anonymous");
    expect((await signIn(viewer.key)).status).toBe(204);
    const firstVisit = (await accessKeys.findCurrent(test.db, viewer.id))
      ?.claimedAt;

    const again = await signIn(viewer.key);

    expect(again.status).toBe(204);
    await expectSession(server, again);
    const key = await accessKeys.findCurrent(test.db, viewer.id);
    expect(key?.claimedAt).toEqual(firstVisit);

    await accessKeys.setAccessUntil(
      test.db,
      viewer.keyId,
      new Date(Date.now() - 1000),
    );
    const ended = await signIn(viewer.key);
    await expectError(route, ended, "invalid_access_key", { state: "ended" });
  });

  it("refuses a password user's key", async () => {
    const person = await addKeyHolder(test.db, auth, "member", {
      withPassword: true,
      key: { claimed: true },
    });

    const response = await signIn(person.key);

    await expectError(route, response, "invalid_access_key", {
      state: "claimed",
    });
    expect(response.headers.getSetCookie()).toEqual([]);
  });

  it("refuses a waiting password user's key without claiming it", async () => {
    const person = await addKeyHolder(test.db, auth, "guest");

    const response = await signIn(person.key);

    await expectError(route, response, "invalid_access_key", {
      state: "waiting",
    });
    const key = await accessKeys.findCurrent(test.db, person.id);
    expect(key?.claimedAt).toBeNull();
  });

  it.each([
    ["expired", { claimBefore: new Date(Date.now() - DAY_MS) }],
    ["revoked", { claimed: true, revoked: true }],
    ["ended", { claimed: true, accessUntil: new Date(Date.now() - DAY_MS) }],
  ] as const)("refuses a %s key with its state", async (state, key) => {
    const viewer = await addKeyHolder(test.db, auth, "anonymous", { key });

    const response = await signIn(viewer.key);

    await expectError(route, response, "invalid_access_key", { state });
  });

  it("refuses a replaced key, and lets the new one in", async () => {
    const viewer = await addKeyHolder(test.db, auth, "anonymous", {
      key: { claimed: true },
    });
    const replaced = await replaceKey(test.db, viewer);

    await expectError(route, await signIn(viewer.key), "invalid_access_key", {
      state: "replaced",
    });
    expect((await signIn(replaced.key)).status).toBe(204);
  });

  it("refuses an unknown key", async () => {
    const response = await signIn(newKey().key);

    await expectError(route, response, "invalid_access_key", {
      state: "unknown",
    });
  });

  it("is rate-limited per client address", async () => {
    const viewer = await addKeyHolder(test.db, auth, "anonymous");
    const last = await exhaustRateLimit(
      (address) =>
        post(server, "/access/sign-in", { key: viewer.key }, { address }),
      publicWriteRateLimit.max,
    );

    await expectError(route, last, "rate_limited");
    expect((await signIn(viewer.key)).status).toBe(204);
  });
});

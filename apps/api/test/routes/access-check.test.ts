import { apiContract } from "@fpr/contracts";
import { accessKeys } from "@fpr/db";
import { createTestDatabase, type TestDatabase } from "@fpr/db/testing";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { newKey } from "../../src/access/keys.js";
import type { Auth } from "../../src/auth/auth.js";
import { publicWriteRateLimit } from "../../src/pipeline/index.js";
import {
  addKeyHolder,
  DAY_MS,
  exhaustRateLimit,
  expectError,
  parseOutput,
  post,
  replaceKey,
} from "../access-support.js";
import { createTestAuth, serveApp, type TestServer } from "../test-support.js";

const route = apiContract.access.check;

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

async function check(key: string) {
  const response = await post(server, "/access/check", { key });
  expect(response.status).toBe(200);
  return parseOutput(route, response);
}

describe("POST /api/access/check", () => {
  it("gives a waiting password user's email, name, colour, and picture", async () => {
    const person = await addKeyHolder(test.db, auth, "member");

    expect(await check(person.key)).toEqual({
      state: "waiting",
      signsInWith: "password",
      email: person.email,
      displayName: person.displayName,
      color: 1,
      avatarUrl: null,
      hasPassword: false,
    });
  });

  it("says when a waiting password user already has a password", async () => {
    const person = await addKeyHolder(test.db, auth, "guest", {
      withPassword: true,
    });

    expect(await check(person.key)).toMatchObject({
      state: "waiting",
      signsInWith: "password",
      hasPassword: true,
    });
  });

  it("gives a waiting anonymous viewer's key without who it is for", async () => {
    const viewer = await addKeyHolder(test.db, auth, "anonymous");

    expect(await check(viewer.key)).toEqual({
      state: "waiting",
      signsInWith: "link",
    });
  });

  it("says a used key is claimed", async () => {
    const person = await addKeyHolder(test.db, auth, "member", {
      withPassword: true,
      key: { claimed: true },
    });

    expect(await check(person.key)).toEqual({
      state: "claimed",
      signsInWith: "password",
    });
  });

  it("says a key past its first-use deadline is expired", async () => {
    const person = await addKeyHolder(test.db, auth, "member", {
      key: { claimBefore: new Date(Date.now() - DAY_MS) },
    });

    expect(await check(person.key)).toEqual({
      state: "expired",
      signsInWith: "password",
    });
  });

  it("says a key revoked by a newer link is replaced", async () => {
    const person = await addKeyHolder(test.db, auth, "member");
    await replaceKey(test.db, person);

    expect(await check(person.key)).toEqual({
      state: "replaced",
      signsInWith: "password",
    });
  });

  it("says a key the admin revoked is revoked", async () => {
    const viewer = await addKeyHolder(test.db, auth, "anonymous", {
      key: { claimed: true, revoked: true },
    });

    expect(await check(viewer.key)).toEqual({
      state: "revoked",
      signsInWith: "link",
    });
  });

  it("says a key past the access end date is ended, claimed or not", async () => {
    const accessUntil = new Date(Date.now() - DAY_MS);
    const claimed = await addKeyHolder(test.db, auth, "member", {
      key: { claimed: true, accessUntil },
    });
    const waiting = await addKeyHolder(test.db, auth, "member", {
      key: { accessUntil },
    });

    expect(await check(claimed.key)).toEqual({
      state: "ended",
      signsInWith: "password",
    });
    expect(await check(waiting.key)).toEqual({
      state: "ended",
      signsInWith: "password",
    });
  });

  it("says a key nobody has is unknown", async () => {
    expect(await check(newKey().key)).toEqual({ state: "unknown" });
  });

  it("changes nothing", async () => {
    const person = await addKeyHolder(test.db, auth, "member");
    await check(person.key);

    const key = await accessKeys.findCurrent(test.db, person.id);
    expect(key?.claimedAt).toBeNull();
  });

  it("is rate-limited per client address", async () => {
    const { key } = newKey();
    const last = await exhaustRateLimit(
      (address) => post(server, "/access/check", { key }, { address }),
      publicWriteRateLimit.max,
    );

    await expectError(route, last, "rate_limited");
    expect((await check(key)).state).toBe("unknown");
  });
});

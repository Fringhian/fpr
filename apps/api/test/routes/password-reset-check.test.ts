import { apiContract } from "@fpr/contracts";
import { resetKeys } from "@fpr/db";
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
import { createTestAuth, serveApp, type TestServer } from "../test-support.js";

const route = apiContract.access.checkReset;

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

function checkReset(email: string, key: string) {
  return post(server, "/password-reset/check", { email, key });
}

describe("POST /api/password-reset/check", () => {
  it("accepts a usable pair, whatever the email's case, and uses nothing", async () => {
    const person = await personWithResetKey();

    const response = await checkReset(
      person.email.toUpperCase(),
      person.resetKey,
    );

    expect(response.status).toBe(204);
    expect(await response.text()).toBe("");
    expect((await checkReset(person.email, person.resetKey)).status).toBe(204);
  });

  it("gives one generic error for a wrong email, a wrong key, or another person's key", async () => {
    const person = await personWithResetKey();
    const other = await personWithResetKey();

    const responses = [
      await checkReset("someone-else@example.com", person.resetKey),
      await checkReset(person.email, newKey().key),
      await checkReset(person.email, other.resetKey),
    ];

    for (const response of responses) {
      await expectError(route, response, "invalid_reset_key");
    }
  });

  it("refuses a key past its 24 hours", async () => {
    const person = await addKeyHolder(test.db, auth, "member", {
      withPassword: true,
      key: { claimed: true },
    });
    const resetKey = await addResetKey(test.db, person.id, {
      expiresAt: new Date(Date.now() - 1000),
    });

    await expectError(
      route,
      await checkReset(person.email, resetKey),
      "invalid_reset_key",
    );
  });

  it("refuses a key a newer one replaced", async () => {
    const person = await personWithResetKey();
    await resetKeys.revokeUnused(test.db, person.id);
    const newer = await addResetKey(test.db, person.id);

    await expectError(
      route,
      await checkReset(person.email, person.resetKey),
      "invalid_reset_key",
    );
    expect((await checkReset(person.email, newer)).status).toBe(204);
  });

  it("refuses a key given to an anonymous viewer", async () => {
    const viewer = await addKeyHolder(test.db, auth, "anonymous", {
      key: { claimed: true },
    });
    const resetKey = await addResetKey(test.db, viewer.id);

    await expectError(
      route,
      await checkReset(viewer.email, resetKey),
      "invalid_reset_key",
    );
  });

  it("is rate-limited per client address", async () => {
    const person = await personWithResetKey();
    const last = await exhaustRateLimit(
      (address) =>
        post(
          server,
          "/password-reset/check",
          { email: person.email, key: person.resetKey },
          { address },
        ),
      publicWriteRateLimit.max,
    );

    await expectError(route, last, "rate_limited");
    expect((await checkReset(person.email, person.resetKey)).status).toBe(204);
  });
});

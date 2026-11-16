import { apiContract } from "@fpr/contracts";
import { accessKeys, users } from "@fpr/db";
import { createTestDatabase, type TestDatabase } from "@fpr/db/testing";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Auth } from "../../src/auth/auth.js";
import { publicWriteRateLimit } from "../../src/pipeline/index.js";
import {
  exhaustRateLimit,
  expectError,
  expectSession,
  parseOutput,
  post,
} from "../access-support.js";
import {
  createTestAuth,
  postSignIn,
  serveApp,
  TEST_BOOTSTRAP_KEY,
  type TestServer,
} from "../test-support.js";

const route = apiContract.access.setup;

const firstAdmin = {
  bootstrapKey: TEST_BOOTSTRAP_KEY,
  email: "First.Admin@Example.com",
  displayName: "First Admin",
  password: "the first admin's password",
};

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

async function adminExists(): Promise<boolean> {
  const response = await fetch(`${server.url}/api/setup`);
  expect(response.status).toBe(200);
  const status = await parseOutput(apiContract.access.setupStatus, response);
  return status.adminExists;
}

describe("POST /api/setup", () => {
  it("refuses a write from another origin", async () => {
    const response = await post(server, "/setup", firstAdmin, {
      origin: "https://elsewhere.example.test",
    });

    await expectError(route, response, "forbidden");
  });

  it("refuses a key other than ADMIN_BOOTSTRAP_KEY, creating nobody", async () => {
    const response = await post(server, "/setup", {
      ...firstAdmin,
      bootstrapKey: `${TEST_BOOTSTRAP_KEY}x`,
    });

    await expectError(route, response, "invalid_bootstrap_key");
    expect(await users.countAdmins(test.db)).toBe(0);
    expect(await adminExists()).toBe(false);
  });

  it("never logs the bootstrap key or the password, even when it refuses them", async () => {
    const secrets = {
      bootstrapKey: "a-bootstrap-key-to-keep-out-of-logs",
      password: "short-pass",
    };

    const refused = await post(server, "/setup", {
      ...firstAdmin,
      ...secrets,
      email: "not an email",
    });

    expect(refused.status).toBe(400);
    const logs = JSON.stringify(server.lines());
    expect(logs).not.toContain(secrets.bootstrapKey);
    expect(logs).not.toContain(secrets.password);
    expect(logs).not.toContain("not an email");
  });

  it("creates the admin with a claimed access key and starts a session", async () => {
    const response = await post(server, "/setup", firstAdmin);

    expect(response.status).toBe(201);
    expect(await response.text()).toBe("");
    const session = await expectSession(server, response);
    expect(session.role).toBe("admin");

    const admin = await users.findById(test.db, session.id);
    expect(admin).toMatchObject({
      email: "first.admin@example.com",
      displayName: "First Admin",
      role: "admin",
      color: 1,
    });
    const key = await accessKeys.findCurrent(test.db, session.id);
    expect(key?.claimedAt).toBeInstanceOf(Date);
    expect(key?.revokedAt).toBeNull();
    expect(key?.codeHash).toMatch(/^[0-9a-f]{64}$/);
    expect(await accessKeys.hasAccess(test.db, session.id)).toBe(true);

    const signIn = await postSignIn(
      server,
      firstAdmin.email,
      firstAdmin.password,
    );
    expect(signIn.status).toBe(200);
    expect(await adminExists()).toBe(true);
  });

  it("is closed with admin_exists once an admin exists, whatever the key", async () => {
    const withKey = await post(server, "/setup", {
      ...firstAdmin,
      email: "second@example.com",
    });
    const withoutKey = await post(server, "/setup", {
      ...firstAdmin,
      email: "second@example.com",
      bootstrapKey: "wrong",
    });

    await expectError(route, withKey, "admin_exists");
    await expectError(route, withoutKey, "admin_exists");
    expect(await users.countAdmins(test.db)).toBe(1);
  });

  it("is rate-limited per client address", async () => {
    const last = await exhaustRateLimit(
      (from) => post(server, "/setup", firstAdmin, { address: from }),
      publicWriteRateLimit.max,
    );

    await expectError(route, last, "rate_limited");
    expect(Number(last.headers.get("Retry-After"))).toBeGreaterThan(0);
    const otherAddress = await post(server, "/setup", firstAdmin);
    await expectError(route, otherAddress, "admin_exists");
  });
});

describe("POST /api/setup, twice at once", () => {
  it("creates one admin", async () => {
    const empty = await createTestDatabase();
    const emptyServer = await serveApp({
      db: empty.db,
      auth: createTestAuth(empty.db),
    });
    try {
      const responses = await Promise.all(
        ["one@example.com", "two@example.com"].map((email) =>
          post(emptyServer, "/setup", { ...firstAdmin, email }),
        ),
      );

      expect(responses.map((response) => response.status).sort()).toEqual([
        201, 409,
      ]);
      expect(await users.countAdmins(empty.db)).toBe(1);
    } finally {
      await emptyServer.close();
      await empty.drop();
    }
  });
});

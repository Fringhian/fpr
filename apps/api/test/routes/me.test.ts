import { createTestDatabase, type TestDatabase } from "@fpr/db/testing";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createTestAuth, serveApp, type TestServer } from "../test-support.js";

let test: TestDatabase;
let server: TestServer;

beforeAll(async () => {
  test = await createTestDatabase();
  server = await serveApp({ db: test.db, auth: createTestAuth(test.db) });
});

afterAll(async () => {
  await server.close();
  await test.drop();
});

describe("GET /api/me", () => {
  it("answers without a session with unauthenticated", async () => {
    const response = await fetch(`${server.url}/api/me`);

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({
      error: { code: "unauthenticated" },
    });
  });
});

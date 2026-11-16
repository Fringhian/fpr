import { apiContract, errorSchema } from "@fpr/contracts";
import { createTestDatabase, type TestDatabase } from "@fpr/db/testing";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Auth } from "../../src/auth/auth.js";
import { addKeyHolder, DAY_MS, post, replaceKey } from "../access-support.js";
import {
  addPerson,
  addSignedIn,
  apiRequest,
  createTestAuth,
  parseOutput,
  serveApp,
  type TestServer,
} from "../test-support.js";

let test: TestDatabase;
let auth: Auth;
let server: TestServer;
let adminCookie: string;

beforeAll(async () => {
  test = await createTestDatabase();
  auth = createTestAuth(test.db);
  server = await serveApp({ db: test.db, auth });
  adminCookie = (await addSignedIn(server, test.db, auth, "admin")).cookie;
});

afterAll(async () => {
  await server.close();
  await test.drop();
});

async function resetKey(id: string): Promise<Response> {
  return apiRequest(server, `/admin/people/${id}/reset-key`, {
    method: "POST",
    cookie: adminCookie,
  });
}

async function newResetKey(id: string): Promise<string> {
  const response = await resetKey(id);
  expect(response.status).toBe(200);
  const result = parseOutput(apiContract.admin.resetKey, await response.json());
  const validFor = Date.parse(result.expiresAt) - Date.now();
  expect(Math.abs(validFor - DAY_MS)).toBeLessThan(60_000);
  return result.resetKey;
}

function checkReset(email: string, key: string): Promise<Response> {
  return post(server, "/password-reset/check", { email, key });
}

describe("POST /api/admin/people/:id/reset-key", () => {
  it("returns a key valid 24 hours that replaces the unused one", async () => {
    const person = await addPerson(test.db, auth, "member");

    const first = await newResetKey(person.id);
    const second = await newResetKey(person.id);

    expect((await checkReset(person.email, first)).status).toBe(422);
    expect((await checkReset(person.email, second)).status).toBe(204);
  });

  it("works for a person whose replaced link waits, who has a password", async () => {
    const holder = await addKeyHolder(test.db, auth, "member", {
      withPassword: true,
      key: { claimed: true },
    });
    await replaceKey(test.db, holder);

    const key = await newResetKey(holder.id);

    expect((await checkReset(holder.email, key)).status).toBe(204);
  });

  it("refuses an anonymous viewer, who has no password", async () => {
    const viewer = await addPerson(test.db, auth, "anonymous");

    const response = await resetKey(viewer.id);

    expect(response.status).toBe(403);
    expect(errorSchema.parse(await response.json()).error.code).toBe(
      "forbidden",
    );
  });
});

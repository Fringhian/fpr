import { apiContract, errorSchema } from "@fpr/contracts";
import { createTestDatabase, type TestDatabase } from "@fpr/db/testing";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import type { Auth } from "../../src/auth/auth.js";
import { addKeyHolder, DAY_MS, post } from "../access-support.js";
import { makeLastAdmin } from "../admin-support.js";
import {
  addSignedIn,
  apiRequest,
  createTestAuth,
  parseOutput,
  serveApp,
  TEST_PUBLIC_URL,
  type TestServer,
} from "../test-support.js";

let test: TestDatabase;
let auth: Auth;
let server: TestServer;
let admin: Awaited<ReturnType<typeof addSignedIn>>;

beforeAll(async () => {
  test = await createTestDatabase();
  auth = createTestAuth(test.db);
  server = await serveApp({ db: test.db, auth });
});

afterAll(async () => {
  await server.close();
  await test.drop();
});

beforeEach(async () => {
  admin = await addSignedIn(server, test.db, auth, "admin");
});

function replaceLink(id: string) {
  return apiRequest(server, `/admin/people/${id}/replace-link`, {
    method: "POST",
    cookie: admin.cookie,
  });
}

async function checkKey(key: string) {
  return (await post(server, "/access/check", { key })).json();
}

describe("POST /api/admin/people/:id/replace-link", () => {
  it("revokes the current key and returns a new waiting link once, with the same access end", async () => {
    const accessUntil = new Date(Date.now() + 5 * DAY_MS);
    const person = await addKeyHolder(test.db, auth, "member", {
      withPassword: true,
      key: { claimed: true, accessUntil },
    });

    const response = await replaceLink(person.id);

    expect(response.status).toBe(200);
    const { person: replaced, accessLink } = parseOutput(
      apiContract.admin.replaceLink,
      await response.json(),
    );
    expect(replaced).toMatchObject({
      accessStatus: "waiting",
      accessUntil: accessUntil.toISOString(),
      hasPassword: true,
    });
    const key = accessLink.slice(`${TEST_PUBLIC_URL}/access/`.length);
    expect(await checkKey(key)).toMatchObject({
      state: "waiting",
      hasPassword: true,
    });
    expect(await checkKey(person.key)).toMatchObject({ state: "replaced" });
  });

  it("ends the person's sessions at once", async () => {
    const person = await addSignedIn(server, test.db, auth, "member");

    expect((await replaceLink(person.id)).status).toBe(200);

    const me = await apiRequest(server, "/me", { cookie: person.cookie });
    expect(me.status).toBe(401);
  });

  it("refuses to replace the last admin's link", async () => {
    await makeLastAdmin(test.db, admin.id);

    const response = await replaceLink(admin.id);

    expect(response.status).toBe(422);
    expect(errorSchema.parse(await response.json()).error.code).toBe(
      "last_admin",
    );
  });
});

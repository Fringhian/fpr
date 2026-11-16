import { apiContract, errorSchema } from "@fpr/contracts";
import { createTestDatabase, type TestDatabase } from "@fpr/db/testing";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import type { Auth } from "../../src/auth/auth.js";
import { makeLastAdmin } from "../admin-support.js";
import {
  addSignedIn,
  apiRequest,
  createTestAuth,
  parseOutput,
  serveApp,
  signIn,
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

function act(id: string, action: "revoke" | "restore") {
  return apiRequest(server, `/admin/people/${id}/${action}`, {
    method: "POST",
    cookie: admin.cookie,
  });
}

describe("POST /api/admin/people/:id/revoke and /restore", () => {
  it("revokes access at once, ending the person's sessions, and restores it", async () => {
    const person = await addSignedIn(server, test.db, auth, "member");

    const revoked = await act(person.id, "revoke");

    expect(revoked.status).toBe(200);
    expect(
      parseOutput(apiContract.admin.revoke, await revoked.json()),
    ).toMatchObject({ accessStatus: "revoked" });
    const sessions = await test.db
      .selectFrom("session")
      .select("id")
      .where("userId", "=", person.id)
      .execute();
    expect(sessions).toEqual([]);
    const cutOff = await apiRequest(server, "/me", { cookie: person.cookie });
    expect(cutOff.status).toBe(401);

    const restored = await act(person.id, "restore");

    expect(restored.status).toBe(200);
    expect(
      parseOutput(apiContract.admin.restore, await restored.json()),
    ).toMatchObject({ accessStatus: "active" });
    const cookie = await signIn(server, person);
    expect((await apiRequest(server, "/me", { cookie })).status).toBe(200);
  });

  it("refuses to revoke the last admin's access", async () => {
    await makeLastAdmin(test.db, admin.id);

    const response = await act(admin.id, "revoke");

    expect(response.status).toBe(422);
    expect(errorSchema.parse(await response.json()).error.code).toBe(
      "last_admin",
    );
  });
});

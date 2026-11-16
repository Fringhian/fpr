import { createTestDatabase, type TestDatabase } from "@fpr/db/testing";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Auth } from "../../src/auth/auth.js";
import {
  addPerson,
  apiRequest,
  cookieFrom,
  createTestAuth,
  newClientAddress,
  postSignIn,
  serveApp,
  signIn,
  TEST_PASSWORD,
  TEST_PUBLIC_URL,
  type TestServer,
} from "../test-support.js";

const NEW_PASSWORD = "a new long enough password";

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

function changePassword(cookie: string, body: unknown): Promise<Response> {
  return fetch(`${server.url}/api/auth/change-password`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Origin: TEST_PUBLIC_URL,
      "X-Forwarded-For": newClientAddress(),
      Cookie: cookie,
    },
    body: JSON.stringify(body),
  });
}

/** Whether a session cookie still signs its person in. */
async function signsIn(cookie: string): Promise<boolean> {
  return (await apiRequest(server, "/me", { cookie })).status === 200;
}

describe("POST /api/auth/change-password", () => {
  it.each([
    ["without revokeOtherSessions", {}],
    ["with revokeOtherSessions false", { revokeOtherSessions: false }],
  ])(
    "changes the password and ends the person's other sessions, %s",
    async (_, extra) => {
      const person = await addPerson(test.db, auth, "member");
      const current = await signIn(server, person);
      const other = await signIn(server, person);
      const someoneElse = await signIn(
        server,
        await addPerson(test.db, auth, "member"),
      );

      const response = await changePassword(current, {
        currentPassword: TEST_PASSWORD,
        newPassword: NEW_PASSWORD,
        ...extra,
      });

      expect(response.status).toBe(200);
      expect(await signsIn(other)).toBe(false);
      expect(await signsIn(cookieFrom(response))).toBe(true);
      expect(await signsIn(someoneElse)).toBe(true);
      expect(
        (await postSignIn(server, person.email, TEST_PASSWORD)).status,
      ).toBe(401);
      expect(
        (await postSignIn(server, person.email, NEW_PASSWORD)).status,
      ).toBe(200);
    },
  );

  it("refuses a wrong current password, and keeps every session", async () => {
    const person = await addPerson(test.db, auth, "member");
    const current = await signIn(server, person);
    const other = await signIn(server, person);

    const response = await changePassword(current, {
      currentPassword: "not the right password",
      newPassword: NEW_PASSWORD,
    });

    expect(response.status).toBe(400);
    expect(await signsIn(current)).toBe(true);
    expect(await signsIn(other)).toBe(true);
  });

  it("lets a guest change their password", async () => {
    const guest = await addPerson(test.db, auth, "guest");

    const response = await changePassword(await signIn(server, guest), {
      currentPassword: TEST_PASSWORD,
      newPassword: NEW_PASSWORD,
    });

    expect(response.status).toBe(200);
  });

  it("refuses an anonymous viewer with forbidden", async () => {
    const viewer = await addPerson(test.db, auth, "anonymous");
    const cookie = await signIn(server, viewer);

    const response = await changePassword(cookie, {
      currentPassword: TEST_PASSWORD,
      newPassword: NEW_PASSWORD,
    });

    expect(response.status).toBe(403);
    expect(await response.json()).toMatchObject({ code: "forbidden" });
    expect((await postSignIn(server, viewer.email, TEST_PASSWORD)).status).toBe(
      200,
    );
  });

  it("answers without a session with 401", async () => {
    const response = await changePassword("", {
      currentPassword: TEST_PASSWORD,
      newPassword: NEW_PASSWORD,
    });

    expect(response.status).toBe(401);
  });
});

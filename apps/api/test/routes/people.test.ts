import { apiContract } from "@fpr/contracts";
import { users } from "@fpr/db";
import { createTestDatabase, type TestDatabase } from "@fpr/db/testing";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Auth } from "../../src/auth/auth.js";
import {
  addSignedIn,
  apiRequest,
  createTestAuth,
  parseOutput,
  pseudonymOf,
  serveApp,
  type TestServer,
} from "../test-support.js";

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

async function readPeople(cookie: string) {
  const response = await apiRequest(server, "/people", { cookie });
  expect(response.status).toBe(200);
  return parseOutput(apiContract.me.people, await response.json());
}

describe("GET /api/people", () => {
  it("lists everyone in the order they were added, with their role", async () => {
    const member = await addSignedIn(server, test.db, auth, "member");
    const guest = await addSignedIn(server, test.db, auth, "guest");
    await users.update(test.db, member.id, { avatarKey: "avatars/m/v1.webp" });

    const people = await readPeople(guest.cookie);

    expect(people).toEqual([
      {
        id: member.id,
        displayName: "Test member",
        avatarUrl: `/api/users/${member.id}/avatar?v=v1`,
        color: 1,
        role: "member",
      },
      {
        id: guest.id,
        displayName: "Test guest",
        avatarUrl: null,
        color: 1,
        role: "guest",
      },
    ]);
  });

  it("gives an anonymous viewer pseudonyms and no pictures", async () => {
    const viewer = await addSignedIn(server, test.db, auth, "anonymous");

    const people = await readPeople(viewer.cookie);

    expect(people.length).toBeGreaterThan(1);
    for (const person of people) {
      expect(person.displayName).toBe(await pseudonymOf(test.db, person.id));
      expect(person.avatarUrl).toBeNull();
    }
  });
});

import { apiContract, colorCount, type Me } from "@fpr/contracts";
import { type Role, users } from "@fpr/db";
import { createTestDatabase, type TestDatabase } from "@fpr/db/testing";
import { sql } from "kysely";
import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import type { Auth } from "../../src/auth/auth.js";
import {
  addPerson,
  addSignedIn,
  apiRequest,
  createTestAuth,
  parseOutput,
  pseudonymOf,
  serveApp,
  TEST_RACE_TIMEZONE,
  type TestPerson,
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

const signedIn = (role: Role) => addSignedIn(server, test.db, auth, role);

/** A body checked against the person `GET /me` answers in its contract. */
function asMe(body: unknown): Me {
  return parseOutput(apiContract.me.get, body);
}

function patchMe(cookie: string, body: unknown): Promise<Response> {
  return apiRequest(server, "/me", { method: "PATCH", cookie, body });
}

describe("GET /api/me", () => {
  it("answers without a session with unauthenticated", async () => {
    const response = await fetch(`${server.url}/api/me`);

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({
      error: { code: "unauthenticated" },
    });
  });

  it("answers the signed-in person, as its contract declares", async () => {
    const person = await signedIn("member");

    const response = await apiRequest(server, "/me", { cookie: person.cookie });

    expect(response.status).toBe(200);
    expect(asMe(await response.json())).toEqual({
      id: person.id,
      role: "member",
      email: person.email,
      raceTimeZone: TEST_RACE_TIMEZONE,
      displayName: "Test member",
      avatarUrl: null,
      color: 1,
      language: null,
      onboarded: false,
    });
  });

  it("answers an anonymous viewer with their pseudonym, without a picture or an email", async () => {
    const viewer = await signedIn("anonymous");
    await users.update(test.db, viewer.id, { avatarKey: "avatars/x/y.webp" });

    const response = await apiRequest(server, "/me", { cookie: viewer.cookie });

    expect(response.status).toBe(200);
    expect(asMe(await response.json())).toMatchObject({
      role: "anonymous",
      displayName: await pseudonymOf(test.db, viewer.id),
      avatarUrl: null,
      email: null,
    });
  });
});

describe("PATCH /api/me", () => {
  it("changes the display name and language, and finishes onboarding", async () => {
    const person = await signedIn("member");

    const response = await patchMe(person.cookie, {
      displayName: "  Robin  ",
      language: "en",
      onboarded: true,
    });

    expect(response.status).toBe(200);
    const me = asMe(await response.json());
    expect(me).toMatchObject({
      displayName: "Robin",
      language: "en",
      onboarded: true,
    });
    const read = await apiRequest(server, "/me", { cookie: person.cookie });
    expect(asMe(await read.json())).toEqual(me);
  });

  it("keeps the moment onboarding first finished", async () => {
    const person = await signedIn("member");
    await patchMe(person.cookie, { onboarded: true });
    const first = (await users.findById(test.db, person.id))?.onboardedAt;

    await patchMe(person.cookie, { onboarded: true });

    expect(first).toBeInstanceOf(Date);
    expect((await users.findById(test.db, person.id))?.onboardedAt).toEqual(
      first,
    );
  });

  it("lets a guest change their own profile", async () => {
    const guest = await signedIn("guest");

    const response = await patchMe(guest.cookie, { displayName: "Visitor" });

    expect(response.status).toBe(200);
    expect(asMe(await response.json())).toMatchObject({
      role: "guest",
      displayName: "Visitor",
    });
  });

  it("refuses an anonymous viewer with forbidden", async () => {
    const viewer = await signedIn("anonymous");

    const response = await patchMe(viewer.cookie, { displayName: "Someone" });

    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({ error: { code: "forbidden" } });
    expect((await users.findById(test.db, viewer.id))?.displayName).toBe(
      "Test anonymous",
    );
  });

  describe("colour", () => {
    let first: TestPerson & { cookie: string };
    let second: TestPerson & { cookie: string };

    beforeAll(async () => {
      first = await signedIn("member");
      second = await signedIn("member");
    });

    // Everyone in the file has colour 1, so every other colour is free.
    beforeEach(async () => {
      await test.db.updateTable("user").set({ color: 1 }).execute();
    });

    it("refuses a colour another person has with color_taken", async () => {
      await patchMe(first.cookie, { color: 4 });

      const response = await patchMe(second.cookie, { color: 4 });

      expect(response.status).toBe(409);
      expect(await response.json()).toEqual({
        error: { code: "color_taken" },
      });
      expect((await users.findById(test.db, second.id))?.color).toBe(1);
    });

    it("keeps the person's own colour, even shared", async () => {
      const response = await patchMe(first.cookie, { color: 1 });

      expect(response.status).toBe(200);
    });

    it("refuses a free colour another person is taking at the same moment", async () => {
      let response: Promise<Response> | undefined;

      // Another write takes the colour lock and gives colour 7 away. The
      // request waits for it, then sees colour 7 taken.
      await test.db.transaction().execute(async (trx) => {
        await users.lockColors(trx);
        await users.update(trx, first.id, { color: 7 });
        response = patchMe(second.cookie, { color: 7 });
        await vi.waitFor(async () => {
          const { waiting } = await sql<{ waiting: number }>`
            select count(*)::int as waiting from pg_locks
            where locktype = 'advisory' and not granted
          `
            .execute(test.db)
            .then(({ rows }) => rows[0] ?? { waiting: 0 });
          expect(waiting).toBe(1);
        });
      });

      expect((await response)?.status).toBe(409);
      expect((await users.findById(test.db, second.id))?.color).toBe(1);
    });

    it("accepts a colour another person has once all ten are taken", async () => {
      for (let color = 1; color <= colorCount; color += 1) {
        const other = await addPerson(test.db, auth, "member");
        await users.update(test.db, other.id, { color });
      }

      const response = await patchMe(second.cookie, { color: 4 });

      expect(response.status).toBe(200);
      expect(asMe(await response.json()).color).toBe(4);
    });
  });
});

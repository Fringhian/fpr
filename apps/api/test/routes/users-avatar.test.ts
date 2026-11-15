import { randomUUID } from "node:crypto";
import { apiContract } from "@fpr/contracts";
import { createTestDatabase, type TestDatabase } from "@fpr/db/testing";
import sharp from "sharp";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Auth } from "../../src/auth.js";
import {
  addPerson,
  apiRequest,
  createTestAuth,
  createTestBucket,
  parseOutput,
  serveApp,
  signIn,
  type TestServer,
  testPicture,
} from "../test-support.js";

let test: TestDatabase;
let auth: Auth;
let server: TestServer;

beforeAll(async () => {
  test = await createTestDatabase();
  auth = createTestAuth(test.db);
  server = await serveApp({
    db: test.db,
    auth,
    avatars: createTestBucket().avatars,
  });
});

afterAll(async () => {
  await server.close();
  await test.drop();
});

async function signedIn(role: "member" | "guest" | "anonymous") {
  const person = await addPerson(test.db, auth, role);
  return { ...person, cookie: await signIn(server, person) };
}

/** Uploads a picture for the person and resolves with their `avatarUrl`. */
async function upload(cookie: string): Promise<string> {
  const response = await apiRequest(server, "/me/avatar", {
    method: "PUT",
    cookie,
    body: await testPicture("png"),
    contentType: "image/png",
  });
  const { avatarUrl } = parseOutput(
    apiContract.me.setAvatar,
    await response.json(),
  );
  if (avatarUrl === null) {
    throw new Error("The upload answered no picture");
  }
  return avatarUrl;
}

/** A GET of a path under the instance's origin, such as an `avatarUrl`. */
function get(path: string, cookie: string): Promise<Response> {
  return apiRequest(server, path.replace(/^\/api/, ""), { cookie });
}

describe("GET /api/users/:userId/avatar", () => {
  it("serves the current picture at its avatarUrl, cached for good", async () => {
    const owner = await signedIn("member");
    const viewer = await signedIn("guest");
    const avatarUrl = await upload(owner.cookie);

    const response = await get(avatarUrl, viewer.cookie);

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("image/webp");
    expect(response.headers.get("cache-control")).toBe(
      "private, max-age=31536000, immutable",
    );
    const picture = new Uint8Array(await response.arrayBuffer());
    expect((await sharp(picture).metadata()).format).toBe("webp");
  });

  it("revalidates a request without the current version", async () => {
    const owner = await signedIn("member");
    const viewer = await signedIn("member");
    const oldUrl = await upload(owner.cookie);
    await upload(owner.cookie);

    for (const path of [`/users/${owner.id}/avatar`, oldUrl]) {
      const response = await get(path, viewer.cookie);

      expect(response.status).toBe(200);
      expect(response.headers.get("cache-control")).toBe("private, no-cache");
    }
  });

  it("answers not_found for a person without a picture, and an unknown person", async () => {
    const owner = await signedIn("member");

    for (const userId of [owner.id, randomUUID()]) {
      const response = await get(`/users/${userId}/avatar`, owner.cookie);

      expect(response.status).toBe(404);
      expect(await response.json()).toEqual({ error: { code: "not_found" } });
    }
  });

  it("answers not_found once the picture is removed", async () => {
    const owner = await signedIn("member");
    const avatarUrl = await upload(owner.cookie);
    await apiRequest(server, "/me/avatar", {
      method: "DELETE",
      cookie: owner.cookie,
    });

    const response = await get(avatarUrl, owner.cookie);

    expect(response.status).toBe(404);
  });

  it("refuses an anonymous viewer with forbidden, and sends no picture", async () => {
    const owner = await signedIn("member");
    const viewer = await signedIn("anonymous");
    const avatarUrl = await upload(owner.cookie);

    const response = await get(avatarUrl, viewer.cookie);

    expect(response.status).toBe(403);
    expect(response.headers.get("content-type")).toMatch(/^application\/json/);
    expect(await response.json()).toEqual({ error: { code: "forbidden" } });
  });

  it("answers without a session with unauthenticated", async () => {
    const owner = await signedIn("member");
    const avatarUrl = await upload(owner.cookie);

    const response = await fetch(`${server.url}${avatarUrl}`);

    expect(response.status).toBe(401);
  });
});

import { randomBytes } from "node:crypto";
import { DeleteObjectCommand } from "@aws-sdk/client-s3";
import { apiContract, avatarMaxBytes, type Me } from "@fpr/contracts";
import { users } from "@fpr/db";
import { createTestDatabase, type TestDatabase } from "@fpr/db/testing";
import sharp from "sharp";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import type { Auth } from "../../src/auth.js";
import {
  addPerson,
  apiRequest,
  createTestAuth,
  createTestBucket,
  parseOutput,
  serveApp,
  signIn,
  TEST_PUBLIC_URL,
  type TestBucket,
  type TestServer,
  testPicture,
} from "../test-support.js";

let test: TestDatabase;
let auth: Auth;
let bucket: TestBucket;
let server: TestServer;

beforeAll(async () => {
  test = await createTestDatabase();
  auth = createTestAuth(test.db);
  bucket = createTestBucket();
  server = await serveApp({ db: test.db, auth, avatars: bucket.avatars });
});

afterAll(async () => {
  await server.close();
  await test.drop();
});

beforeEach(() => {
  bucket.objects.clear();
});

async function signedIn(role: "member" | "guest" | "anonymous") {
  const person = await addPerson(test.db, auth, role);
  return { ...person, cookie: await signIn(server, person) };
}

function putAvatar(
  cookie: string,
  body: Uint8Array,
  contentType = "image/png",
): Promise<Response> {
  return apiRequest(server, "/me/avatar", {
    method: "PUT",
    cookie,
    body,
    contentType,
  });
}

function asMe(body: unknown): Me {
  return parseOutput(apiContract.me.setAvatar, body);
}

async function avatarKeyOf(userId: string): Promise<string | null> {
  return (await users.findById(test.db, userId))?.avatarKey ?? null;
}

describe("PUT /api/me/avatar", () => {
  it.each(["jpeg", "png", "webp"] as const)(
    "stores a %s picture as WebP and answers the person",
    async (format) => {
      const person = await signedIn("member");

      const response = await putAvatar(
        person.cookie,
        await testPicture(format),
        `image/${format}`,
      );

      expect(response.status).toBe(200);
      const me = asMe(await response.json());
      const key = await avatarKeyOf(person.id);
      expect(key).toMatch(
        new RegExp(`^avatars/${person.id}/[0-9a-f-]+\\.webp$`),
      );
      expect(me.avatarUrl).toMatch(
        new RegExp(`^/api/users/${person.id}/avatar\\?v=[0-9a-f-]+$`),
      );
      const stored = bucket.objects.get(key ?? "");
      expect(stored?.contentType).toBe("image/webp");
      expect((await sharp(stored?.body).metadata()).format).toBe("webp");
    },
  );

  it("stores a large picture at most 512 pixels a side, upright, and without its metadata", async () => {
    const person = await signedIn("member");
    // 1200 by 800, to be shown turned a quarter (orientation 6), with a
    // location in its EXIF data.
    const picture = await sharp(
      await testPicture("jpeg", { width: 1200, height: 800 }),
    )
      .withMetadata({ orientation: 6 })
      .withExif({ IFD3: { GPSLatitudeRef: "N", GPSLatitude: "48/1 51/1 0/1" } })
      .jpeg()
      .toBuffer();

    const response = await putAvatar(person.cookie, picture, "image/jpeg");

    expect(response.status).toBe(200);
    const stored = bucket.objects.get((await avatarKeyOf(person.id)) ?? "");
    const metadata = await sharp(stored?.body).metadata();
    expect([metadata.width, metadata.height]).toEqual([341, 512]);
    expect(metadata.exif).toBeUndefined();
    expect(metadata.orientation).toBeUndefined();
  });

  it("replaces the person's picture and removes the old one from the bucket", async () => {
    const person = await signedIn("member");
    await putAvatar(person.cookie, await testPicture("png"));
    const oldKey = await avatarKeyOf(person.id);

    const response = await putAvatar(person.cookie, await testPicture("png"));

    expect(response.status).toBe(200);
    const newKey = await avatarKeyOf(person.id);
    expect(newKey).not.toBe(oldKey);
    expect([...bucket.objects.keys()]).toEqual([newKey]);
  });

  it("keeps the old picture, and removes the new one, when the old one can't be removed", async () => {
    const person = await signedIn("member");
    await putAvatar(person.cookie, await testPicture("png"));
    const oldKey = await avatarKeyOf(person.id);
    bucket.client
      .on(DeleteObjectCommand, { Key: oldKey ?? "" })
      .rejectsOnce(new Error("The bucket is unreachable"));

    const response = await putAvatar(person.cookie, await testPicture("png"));

    expect(response.status).toBe(500);
    expect(await avatarKeyOf(person.id)).toBe(oldKey);
    expect([...bucket.objects.keys()]).toEqual([oldKey]);
  });

  it.each([
    ["random bytes sent as PNG", randomBytes(2048), "image/png"],
    [
      "a PNG signature followed by anything",
      Buffer.concat([
        Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
        randomBytes(2048),
      ]),
      "image/png",
    ],
    ["a GIF", Buffer.from("GIF89a\x01\x00\x01\x00\x00\x00\x00;"), "image/gif"],
    [
      "an SVG",
      Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"/>'),
      "image/svg+xml",
    ],
    ["an empty body", Buffer.alloc(0), "image/png"],
  ])("refuses %s with avatar_type_unsupported", async (_, body, type) => {
    const person = await signedIn("member");

    const response = await putAvatar(person.cookie, body, type);

    expect(response.status).toBe(415);
    expect(await response.json()).toEqual({
      error: { code: "avatar_type_unsupported" },
    });
    expect(await avatarKeyOf(person.id)).toBeNull();
    expect(bucket.objects.size).toBe(0);
  });

  it("refuses a real picture sent with a media type other than an image's", async () => {
    const person = await signedIn("member");

    const response = await putAvatar(
      person.cookie,
      await testPicture("png"),
      "application/octet-stream",
    );

    expect(response.status).toBe(415);
  });

  it("refuses a picture over 2 MB with avatar_too_large", async () => {
    const person = await signedIn("member");
    const body = Buffer.concat([
      await testPicture("png"),
      Buffer.alloc(avatarMaxBytes),
    ]);

    const response = await putAvatar(person.cookie, body);

    expect(response.status).toBe(413);
    expect(await response.json()).toEqual({
      error: { code: "avatar_too_large" },
    });
  });

  it("refuses a body over 2 MB sent without a length", async () => {
    const person = await signedIn("member");
    const chunk = new Uint8Array(256 * 1024);
    let sent = 0;
    const body = new ReadableStream<Uint8Array>({
      pull(controller) {
        if (sent > avatarMaxBytes) {
          controller.close();
          return;
        }
        sent += chunk.byteLength;
        controller.enqueue(chunk);
      },
    });

    const response = await fetch(`${server.url}/api/me/avatar`, {
      method: "PUT",
      headers: {
        Origin: TEST_PUBLIC_URL,
        Cookie: person.cookie,
        "Content-Type": "image/png",
      },
      body,
      duplex: "half",
    });

    expect(response.status).toBe(413);
  });

  it("refuses a picture over 40 megapixels with avatar_too_large", async () => {
    const person = await signedIn("member");
    const picture = await testPicture("png", { width: 8000, height: 6000 });
    expect(picture.byteLength).toBeLessThan(avatarMaxBytes);

    const response = await putAvatar(person.cookie, picture);

    expect(response.status).toBe(413);
  });

  it("lets a guest upload their picture", async () => {
    const guest = await signedIn("guest");

    const response = await putAvatar(guest.cookie, await testPicture("png"));

    expect(response.status).toBe(200);
  });

  it("refuses an anonymous viewer with forbidden", async () => {
    const viewer = await signedIn("anonymous");

    const response = await putAvatar(viewer.cookie, await testPicture("png"));

    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({ error: { code: "forbidden" } });
    expect(bucket.objects.size).toBe(0);
  });
});

describe("DELETE /api/me/avatar", () => {
  it("removes the picture from the bucket and empties avatar_key", async () => {
    const person = await signedIn("member");
    await putAvatar(person.cookie, await testPicture("png"));

    const response = await apiRequest(server, "/me/avatar", {
      method: "DELETE",
      cookie: person.cookie,
    });

    expect(response.status).toBe(200);
    expect(
      parseOutput(apiContract.me.deleteAvatar, await response.json()),
    ).toMatchObject({ id: person.id, avatarUrl: null });
    expect(await avatarKeyOf(person.id)).toBeNull();
    expect(bucket.objects.size).toBe(0);
  });

  it("answers the person without a picture as they are", async () => {
    const person = await signedIn("member");

    const response = await apiRequest(server, "/me/avatar", {
      method: "DELETE",
      cookie: person.cookie,
    });

    expect(response.status).toBe(200);
  });

  it("keeps the picture when the bucket can't remove it", async () => {
    const person = await signedIn("member");
    await putAvatar(person.cookie, await testPicture("png"));
    const key = await avatarKeyOf(person.id);
    bucket.client
      .on(DeleteObjectCommand, { Key: key ?? "" })
      .rejectsOnce(new Error("The bucket is unreachable"));

    const response = await apiRequest(server, "/me/avatar", {
      method: "DELETE",
      cookie: person.cookie,
    });

    expect(response.status).toBe(500);
    expect(await avatarKeyOf(person.id)).toBe(key);
  });

  it("refuses an anonymous viewer with forbidden", async () => {
    const viewer = await signedIn("anonymous");

    const response = await apiRequest(server, "/me/avatar", {
      method: "DELETE",
      cookie: viewer.cookie,
    });

    expect(response.status).toBe(403);
  });
});

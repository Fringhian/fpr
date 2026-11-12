import { describe, expect, it } from "vitest";
import { anonymizeKind } from "../../anonymize.js";
import {
  avatarMaxBytes,
  avatarMediaTypes,
  avatarSchema,
  avatarUploadSchema,
} from "./avatar.js";

// The package compiles without Node's or the DOM's types, so the tests reach
// the runtime's File and Blob through globalThis.
const { File, Blob } = globalThis as unknown as {
  File: new (
    bits: Uint8Array[],
    name: string,
    options: { type: string },
  ) => { readonly type: string; readonly size: number };
  Blob: new (bits: Uint8Array[]) => object;
};

function picture(type: string, size = 16) {
  return new File([new Uint8Array(size)], "picture", { type });
}

describe("picture limits", () => {
  it("are 2 MB, and JPEG, PNG, or WebP", () => {
    expect(avatarMaxBytes).toBe(2 * 1024 * 1024);
    expect(avatarMediaTypes).toEqual(["image/jpeg", "image/png", "image/webp"]);
  });
});

describe("PUT /me/avatar", () => {
  it.each([...avatarMediaTypes])("accepts a %s picture", (type) => {
    const file = picture(type);
    expect(avatarUploadSchema.parse(file)).toBe(file);
  });

  // The handler answers these with avatar_type_unsupported and
  // avatar_too_large, not the schema with invalid_request.
  it("lets another format or a larger picture through to the handler", () => {
    expect(avatarUploadSchema.safeParse(picture("image/gif")).success).toBe(
      true,
    );
    expect(
      avatarUploadSchema.safeParse(picture("image/png", avatarMaxBytes + 1))
        .success,
    ).toBe(true);
  });

  it.each([
    ["no body", undefined],
    ["text", "picture"],
    ["JSON", { avatar: "picture.png" }],
    ["a blob that isn't a file", new Blob([new Uint8Array(16)])],
  ])("refuses %s", (_, body) => {
    expect(avatarUploadSchema.safeParse(body).success).toBe(false);
  });
});

describe("GET /users/{userId}/avatar", () => {
  // A file has no field name for the anonymization test to read.
  it("answers the picture as a file, marked personal", () => {
    const file = picture("image/webp");
    expect(avatarSchema.parse(file)).toBe(file);
    expect(avatarSchema.safeParse({ url: "picture.webp" }).success).toBe(false);
    expect(anonymizeKind(avatarSchema)).toBe("personal");
  });
});

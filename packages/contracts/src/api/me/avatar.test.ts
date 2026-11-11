import { describe, expect, it } from "vitest";
import { anonymizeKind } from "../../anonymize.js";
import { createOpenApiDocument } from "../../openapi.js";
import {
  avatarMaxBytes,
  avatarMediaTypes,
  avatarSchema,
  avatarUploadSchema,
  deleteMeAvatar,
  getUserAvatar,
  setMeAvatar,
} from "./avatar.js";
import { meSchema } from "./profile.js";

const userId = "0b6f3c1e-8a2d-4c7e-9f10-2b3c4d5e6f70";

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

const sessionCodes = ["access_ended", "internal_error", "unauthenticated"];

describe("picture limits", () => {
  it("are 2 MB, and JPEG, PNG, or WebP", () => {
    expect(avatarMaxBytes).toBe(2 * 1024 * 1024);
    expect(avatarMediaTypes).toEqual(["image/jpeg", "image/png", "image/webp"]);
  });
});

describe("PUT /me/avatar", () => {
  it("is declared for everyone but anonymous viewers, with the picture codes", () => {
    const { route, meta, errorMap } = setMeAvatar["~orpc"];
    expect(route).toMatchObject({ method: "PUT", path: "/me/avatar" });
    expect(meta.roles).toEqual(["admin", "member", "guest"]);
    expect(Object.keys(errorMap).sort()).toEqual(
      [
        ...sessionCodes,
        "avatar_too_large",
        "avatar_type_unsupported",
        "forbidden",
        "invalid_request",
      ].sort(),
    );
  });

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

  it("answers the person with their new picture", () => {
    expect(setMeAvatar["~orpc"].outputSchema).toBe(meSchema);
  });

  it("is in the OpenAPI document as a raw body, with its 413 and 415", async () => {
    const operation = (await createOpenApiDocument()).paths?.["/me/avatar"]
      ?.put;

    expect(operation).toMatchObject({
      operationId: "me.setAvatar",
      tags: ["me"],
      "x-roles": ["admin", "member", "guest"],
      requestBody: {
        required: true,
        content: {
          "*/*": { schema: { type: "string", contentMediaType: "*/*" } },
        },
      },
      responses: {
        "413": { description: "`avatar_too_large`" },
        "415": { description: "`avatar_type_unsupported`" },
      },
    });
    expect(operation?.requestBody).toEqual({
      required: true,
      content: {
        "*/*": {
          schema: {
            type: "string",
            contentMediaType: "*/*",
            description: expect.stringContaining("raw body"),
          },
        },
      },
    });
    expect(Object.keys(operation?.responses ?? {}).sort()).toEqual([
      "200",
      "400",
      "401",
      "403",
      "413",
      "415",
      "500",
    ]);
  });
});

describe("DELETE /me/avatar", () => {
  it("is declared for everyone but anonymous viewers, with no input", () => {
    const { route, meta, errorMap, inputSchema, outputSchema } =
      deleteMeAvatar["~orpc"];
    expect(route).toMatchObject({ method: "DELETE", path: "/me/avatar" });
    expect(meta.roles).toEqual(["admin", "member", "guest"]);
    expect(inputSchema).toBeUndefined();
    expect(outputSchema).toBe(meSchema);
    expect(Object.keys(errorMap).sort()).toEqual(
      [...sessionCodes, "forbidden"].sort(),
    );
  });

  it("is in the OpenAPI document, without a body", async () => {
    const operation = (await createOpenApiDocument()).paths?.["/me/avatar"]
      ?.delete;

    expect(operation).toMatchObject({
      operationId: "me.deleteAvatar",
      "x-roles": ["admin", "member", "guest"],
    });
    expect(operation?.requestBody).toBeUndefined();
  });
});

describe("GET /users/{userId}/avatar", () => {
  it("refuses anonymous viewers, who see no photos", () => {
    const { route, meta, errorMap } = getUserAvatar["~orpc"];
    expect(route).toMatchObject({
      method: "GET",
      path: "/users/{userId}/avatar",
    });
    expect(meta.roles).toEqual(["admin", "member", "guest"]);
    expect(meta.roles).not.toContain("anonymous");
    expect(Object.keys(errorMap).sort()).toEqual(
      [...sessionCodes, "forbidden", "invalid_request", "not_found"].sort(),
    );
  });

  it("takes a person's id", () => {
    const input = getUserAvatar["~orpc"].inputSchema;
    expect(input?.["~standard"].validate({ userId })).toEqual({
      value: { userId },
    });
    expect(input?.["~standard"].validate({ userId: "alex" })).toHaveProperty(
      "issues",
    );
    expect(input?.["~standard"].validate({})).toHaveProperty("issues");
  });

  it("answers the picture as a file, marked personal", () => {
    const file = picture("image/webp");
    expect(avatarSchema.parse(file)).toBe(file);
    expect(avatarSchema.safeParse({ url: "picture.webp" }).success).toBe(false);
    expect(anonymizeKind(avatarSchema)).toBe("personal");
  });

  it("is in the OpenAPI document as a binary response", async () => {
    const operation = (await createOpenApiDocument()).paths?.[
      "/users/{userId}/avatar"
    ]?.get;

    expect(operation).toMatchObject({
      operationId: "me.getAvatar",
      tags: ["me"],
      "x-roles": ["admin", "member", "guest"],
      parameters: [{ name: "userId", in: "path", required: true }],
      responses: {
        "200": {
          content: {
            "*/*": {
              schema: {
                type: "string",
                contentMediaType: "*/*",
                "x-anonymize": "personal",
              },
            },
          },
        },
        "403": { description: "`forbidden`" },
        "404": { description: "`not_found`" },
      },
    });
    expect(Object.keys(operation?.responses ?? {}).sort()).toEqual([
      "200",
      "400",
      "401",
      "403",
      "404",
      "500",
    ]);
  });
});

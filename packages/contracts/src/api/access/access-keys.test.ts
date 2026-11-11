import { describe, expect, it } from "vitest";
import { anonymizeKind } from "../../anonymize.js";
import { createOpenApiDocument } from "../../openapi.js";
import {
  type AccessCheckResponse,
  accessCheckBodySchema,
  accessCheckResponseSchema,
  accessClaimBodySchema,
  accessClaimResponseSchema,
  accessKeyErrorDetailsSchema,
  accessKeySchema,
  accessKeyStates,
  accessSignInBodySchema,
  checkAccessKey,
  claimAccessKey,
  signInWithAccessKey,
} from "./access-keys.js";

/** 32 bytes in base64url: 43 characters. */
const key = "dGhpcy1pcy1hbi1pbnZlbnRlZC1hY2Nlc3Mta2V5LTA";

const waitingPasswordUser: AccessCheckResponse = {
  state: "waiting",
  signsInWith: "password",
  email: "alex.martin@example.com",
  displayName: "Alex Martin",
  hasPassword: false,
};

describe("accessKeySchema", () => {
  it("accepts 43 base64url characters", () => {
    expect(accessKeySchema.safeParse(key).success).toBe(true);
    expect(accessKeySchema.safeParse(`${key.slice(0, 41)}-_`).success).toBe(
      true,
    );
  });

  it.each([
    ["a shorter key", key.slice(1)],
    ["a longer key", `${key}A`],
    ["padding", `${key.slice(1)}=`],
    ["base64 characters", `${key.slice(2)}+/`],
    ["an empty key", ""],
  ])("refuses %s", (_, value) => {
    expect(accessKeySchema.safeParse(value).success).toBe(false);
  });
});

describe("POST /access/check", () => {
  it("is public, and declares each refusal", () => {
    const { route, meta, errorMap } = checkAccessKey["~orpc"];
    expect(route).toMatchObject({ method: "POST", path: "/access/check" });
    expect(meta.roles).toBe("public");
    expect(Object.keys(errorMap).sort()).toEqual(
      ["forbidden", "internal_error", "invalid_request", "rate_limited"].sort(),
    );
  });

  it("takes the key, and refuses a malformed one", () => {
    expect(accessCheckBodySchema.parse({ key })).toEqual({ key });
    expect(accessCheckBodySchema.safeParse({ key: "abc" }).success).toBe(false);
    expect(accessCheckBodySchema.safeParse({}).success).toBe(false);
  });

  it("answers who a waiting key of a password user is for", () => {
    expect(accessCheckResponseSchema.parse(waitingPasswordUser)).toEqual(
      waitingPasswordUser,
    );
    expect(
      accessCheckResponseSchema.safeParse({
        state: "waiting",
        signsInWith: "password",
      }).success,
    ).toBe(false);
  });

  it("answers a waiting key of an anonymous viewer without its person", () => {
    const waiting = { state: "waiting", signsInWith: "link" };
    expect(accessCheckResponseSchema.parse(waiting)).toEqual(waiting);
  });

  it.each(
    accessKeyStates.filter(
      (state) => state !== "waiting" && state !== "unknown",
    ),
  )("answers a %s key with how its person signs in", (state) => {
    for (const signsInWith of ["password", "link"]) {
      expect(
        accessCheckResponseSchema.safeParse({ state, signsInWith }).success,
      ).toBe(true);
    }
    expect(accessCheckResponseSchema.safeParse({ state }).success).toBe(false);
  });

  it("answers an unknown key with its state alone", () => {
    expect(accessCheckResponseSchema.parse({ state: "unknown" })).toEqual({
      state: "unknown",
    });
  });

  it("refuses a state outside the list", () => {
    expect(
      accessCheckResponseSchema.safeParse({
        state: "active",
        signsInWith: "password",
      }).success,
    ).toBe(false);
  });

  it("marks the email and display name personal", () => {
    const [waiting] = accessCheckResponseSchema.options;
    const [passwordUser] = waiting.options;
    expect(anonymizeKind(passwordUser.shape.email)).toBe("personal");
    expect(anonymizeKind(passwordUser.shape.displayName)).toBe("personal");
  });
});

describe("POST /access/claim", () => {
  it("is public, and declares each refusal", () => {
    const { route, meta, errorMap } = claimAccessKey["~orpc"];
    expect(route).toMatchObject({ method: "POST", path: "/access/claim" });
    expect(meta.roles).toBe("public");
    expect(Object.keys(errorMap).sort()).toEqual(
      [
        "forbidden",
        "internal_error",
        "invalid_access_key",
        "invalid_request",
        "rate_limited",
      ].sort(),
    );
  });

  it("takes the key, with the password when the person has none", () => {
    const body = { key, password: "correct horse battery" };
    expect(accessClaimBodySchema.parse(body)).toEqual(body);
    expect(accessClaimBodySchema.parse({ key })).toEqual({ key });
  });

  it("refuses a password under 12 characters, or a malformed key", () => {
    expect(
      accessClaimBodySchema.safeParse({ key, password: "short" }).success,
    ).toBe(false);
    expect(
      accessClaimBodySchema.safeParse({
        key: "abc",
        password: "correct horse battery",
      }).success,
    ).toBe(false);
  });

  it("answers whether a session started", () => {
    expect(accessClaimResponseSchema.parse({ signedIn: true })).toEqual({
      signedIn: true,
    });
    expect(accessClaimResponseSchema.safeParse({}).success).toBe(false);
  });
});

describe("POST /access/sign-in", () => {
  it("is public, answers 204, and declares each refusal", () => {
    const { route, meta, errorMap } = signInWithAccessKey["~orpc"];
    expect(route).toMatchObject({
      method: "POST",
      path: "/access/sign-in",
      successStatus: 204,
    });
    expect(meta.roles).toBe("public");
    expect(Object.keys(errorMap).sort()).toEqual(
      [
        "forbidden",
        "internal_error",
        "invalid_access_key",
        "invalid_request",
        "rate_limited",
      ].sort(),
    );
  });

  it("takes the key, and refuses a malformed one", () => {
    expect(accessSignInBodySchema.parse({ key })).toEqual({ key });
    expect(accessSignInBodySchema.safeParse({ key: `${key}=` }).success).toBe(
      false,
    );
  });
});

describe("invalid_access_key", () => {
  it("carries the key's state in its details", () => {
    expect(accessKeyErrorDetailsSchema.parse({ state: "expired" })).toEqual({
      state: "expired",
    });
    expect(accessKeyErrorDetailsSchema.safeParse({}).success).toBe(false);
  });
});

describe("the OpenAPI document", () => {
  it("lists the access key routes, with their statuses and markers", async () => {
    const paths = (await createOpenApiDocument()).paths;

    expect(paths?.["/access/check"]?.post).toMatchObject({
      operationId: "access.check",
      "x-roles": "public",
    });
    const claim = paths?.["/access/claim"]?.post;
    expect(claim).toMatchObject({
      operationId: "access.claim",
      "x-roles": "public",
      responses: { "422": { description: "`invalid_access_key`" } },
    });
    expect(Object.keys(claim?.responses ?? {}).sort()).toEqual([
      "200",
      "400",
      "403",
      "422",
      "429",
      "500",
    ]);
    expect(paths?.["/access/sign-in"]?.post).toMatchObject({
      operationId: "access.signIn",
      "x-roles": "public",
      responses: { "204": {}, "422": { description: "`invalid_access_key`" } },
    });

    const checkResponse = JSON.stringify(
      paths?.["/access/check"]?.post?.responses?.["200"],
    );
    expect(checkResponse).toContain(
      '"email":{"type":"string","format":"email","x-anonymize":"personal"}',
    );
    expect(checkResponse).toMatch(
      /"displayName":\{[^}]*"x-anonymize":"personal"\}/,
    );
  });
});

import { describe, expect, it } from "vitest";
import {
  type AccessCheckResponse,
  accessCheckBodySchema,
  accessCheckResponseSchema,
  accessClaimBodySchema,
  accessClaimResponseSchema,
  accessKeyErrorDetailsSchema,
  accessKeyStates,
  accessSignInBodySchema,
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

describe("POST /access/check", () => {
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
});

describe("POST /access/claim", () => {
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

import { describe, expect, it } from "vitest";
import { anonymizeKind } from "../../anonymize.js";
import { createOpenApiDocument } from "../../openapi.js";
import {
  type AdminPerson,
  adminAddPersonSchema,
  adminPersonSchema,
  adminPersonWithLinkSchema,
  adminUpdatePersonSchema,
} from "./people.js";

const id = "0b6f3c1e-8a2d-4c7e-9f10-2b3c4d5e6f70";

const alex: AdminPerson = {
  id,
  displayName: "Alex Martin",
  avatarUrl: null,
  color: 3,
  role: "member",
  email: "alex.martin@example.com",
  accessStatus: "waiting",
  claimBefore: "2026-03-09T17:30:00Z",
  accessUntil: null,
  hasPortfolioEntries: false,
};

describe("adminPersonSchema", () => {
  it("accepts a person, and an anonymous viewer without email", () => {
    expect(adminPersonSchema.parse(alex)).toEqual(alex);
    const viewer = { ...alex, role: "anonymous", email: null };
    expect(adminPersonSchema.parse(viewer)).toEqual(viewer);
  });

  it.each(["waiting", "active", "expired", "revoked", "ended"])(
    "accepts the access status %s",
    (accessStatus) => {
      expect(
        adminPersonSchema.safeParse({ ...alex, accessStatus }).success,
      ).toBe(true);
    },
  );

  it("refuses an unknown access status, a bad email, or a missing deadline", () => {
    expect(
      adminPersonSchema.safeParse({ ...alex, accessStatus: "replaced" })
        .success,
    ).toBe(false);
    expect(
      adminPersonSchema.safeParse({ ...alex, email: "alex" }).success,
    ).toBe(false);
    const { claimBefore: _, ...withoutDeadline } = alex;
    expect(adminPersonSchema.safeParse(withoutDeadline).success).toBe(false);
  });

  it("marks the name, picture, and email personal, and keeps the rest", () => {
    const { shape } = adminPersonSchema;
    expect(anonymizeKind(shape.displayName)).toBe("personal");
    expect(anonymizeKind(shape.avatarUrl)).toBe("personal");
    expect(anonymizeKind(shape.email)).toBe("personal");
    expect(anonymizeKind(shape.role)).toBeUndefined();
    expect(anonymizeKind(shape.accessStatus)).toBeUndefined();
  });
});

describe("adminPersonWithLinkSchema", () => {
  it("accepts a person with their link, and refuses a link that isn't a URL", () => {
    const added = {
      person: alex,
      accessLink: "https://fpr.example.com/access/c2VjcmV0LWtleS1mb3ItdGVzdHM",
    };
    expect(adminPersonWithLinkSchema.parse(added)).toEqual(added);
    expect(
      adminPersonWithLinkSchema.safeParse({ ...added, accessLink: "secret" })
        .success,
    ).toBe(false);
  });

  it("leaves the link unmarked: it goes to the admin only", () => {
    expect(
      anonymizeKind(adminPersonWithLinkSchema.shape.accessLink),
    ).toBeUndefined();
  });
});

describe("adminAddPersonSchema", () => {
  it("accepts a password user with an email, and an anonymous viewer without", () => {
    const member = {
      displayName: "Alex Martin",
      email: "alex.martin@example.com",
      role: "member",
      accessUntil: "2026-12-31T23:59:59+01:00",
    };
    expect(adminAddPersonSchema.parse(member)).toEqual(member);
    const viewer = { displayName: "Sam Reviewer", role: "anonymous" };
    expect(adminAddPersonSchema.parse(viewer)).toEqual(viewer);
  });

  it("refuses a password user without email, a long name, or an unknown role", () => {
    expect(
      adminAddPersonSchema.safeParse({ displayName: "Alex", role: "guest" })
        .success,
    ).toBe(false);
    expect(
      adminAddPersonSchema.safeParse({
        displayName: "A".repeat(41),
        email: "alex.martin@example.com",
        role: "member",
      }).success,
    ).toBe(false);
    expect(
      adminAddPersonSchema.safeParse({
        displayName: "Alex",
        email: "alex.martin@example.com",
        role: "owner",
      }).success,
    ).toBe(false);
  });

  it("drops an email given for an anonymous viewer", () => {
    expect(
      adminAddPersonSchema.parse({
        displayName: "Sam Reviewer",
        email: "sam@example.com",
        role: "anonymous",
      }),
    ).toEqual({ displayName: "Sam Reviewer", role: "anonymous" });
  });
});

describe("adminUpdatePersonSchema", () => {
  it("accepts any subset of the fields, and null to remove the end date", () => {
    expect(adminUpdatePersonSchema.parse({ id })).toEqual({ id });
    const change = { id, role: "guest", accessUntil: null };
    expect(adminUpdatePersonSchema.parse(change)).toEqual(change);
  });

  it("takes every role, so the API can refuse anonymous with its own code", () => {
    expect(
      adminUpdatePersonSchema.safeParse({ id, role: "anonymous" }).success,
    ).toBe(true);
  });

  it("refuses a bad id, an empty name, or a bad email", () => {
    expect(adminUpdatePersonSchema.safeParse({ id: "1" }).success).toBe(false);
    expect(
      adminUpdatePersonSchema.safeParse({ id, displayName: "" }).success,
    ).toBe(false);
    expect(
      adminUpdatePersonSchema.safeParse({ id, email: "alex" }).success,
    ).toBe(false);
  });
});

const paths = (await createOpenApiDocument()).paths ?? {};

describe("the OpenAPI document", () => {
  it("marks the personal fields of GET /admin/people", () => {
    expect(paths["/admin/people"]?.get?.responses?.["200"]).toMatchObject({
      content: {
        "application/json": {
          schema: {
            items: {
              properties: {
                displayName: { "x-anonymize": "personal" },
                avatarUrl: { "x-anonymize": "personal" },
                email: { "x-anonymize": "personal" },
              },
            },
          },
        },
      },
    });
  });

  it("answers POST /admin/people with 201", () => {
    expect(
      Object.keys(paths["/admin/people"]?.post?.responses ?? {}),
    ).toContain("201");
  });

  it("answers DELETE /admin/people/{id} with 204", () => {
    expect(
      Object.keys(paths["/admin/people/{id}"]?.delete?.responses ?? {}),
    ).toContain("204");
  });
});

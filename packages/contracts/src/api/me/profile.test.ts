import { describe, expect, it } from "vitest";
import { type Me, meSchema, meUpdateBodySchema } from "./profile.js";

const me: Me = {
  id: "0b6f3c1e-8a2d-4c7e-9f10-2b3c4d5e6f70",
  role: "member",
  displayName: "Alex Martin",
  avatarUrl: null,
  color: 3,
  language: null,
  onboarded: false,
};

describe("GET /me", () => {
  it("accepts the signed-in person, and refuses a colour or name out of range", () => {
    expect(meSchema.parse(me)).toEqual(me);
    expect(
      meSchema.safeParse({ ...me, language: "fr", onboarded: true }).success,
    ).toBe(true);
    expect(meSchema.safeParse({ ...me, color: 11 }).success).toBe(false);
    expect(meSchema.safeParse({ ...me, displayName: "" }).success).toBe(false);
    expect(meSchema.safeParse({ ...me, language: "de" }).success).toBe(false);
    expect(meSchema.safeParse({ ...me, role: "owner" }).success).toBe(false);
  });
});

describe("PATCH /me", () => {
  it.each([
    { displayName: "Alex Martin" },
    { displayName: "A" },
    { displayName: "x".repeat(40) },
    { color: 1 },
    { color: 10 },
    { language: "fr" },
    { language: "en" },
    { onboarded: true },
    { displayName: "Sam Leroy", color: 7, language: "en", onboarded: true },
  ])("accepts %j", (body) => {
    expect(meUpdateBodySchema.parse(body)).toEqual(body);
  });

  it.each([
    {},
    { displayName: "" },
    { displayName: "x".repeat(41) },
    { color: 0 },
    { color: 11 },
    { color: 2.5 },
    { color: "3" },
    { language: "de" },
    { language: null },
    { onboarded: false },
    { role: "admin" },
    { avatarUrl: "https://example.com/a.png" },
  ])("refuses %j", (body) => {
    expect(meUpdateBodySchema.safeParse(body).success).toBe(false);
  });
});

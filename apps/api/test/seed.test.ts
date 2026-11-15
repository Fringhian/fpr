import { users } from "@fpr/db";
import { createTestDatabase, type TestDatabase } from "@fpr/db/testing";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { refuseProduction, seedDatabase } from "../src/seed/seed-database.js";

let test: TestDatabase;

beforeAll(async () => {
  test = await createTestDatabase();
});

afterAll(async () => {
  await test.drop();
});

describe("the seed", () => {
  it("stops in production only", () => {
    expect(() => refuseProduction("production")).toThrow("production");
    expect(() => refuseProduction("development")).not.toThrow();
    expect(() => refuseProduction(undefined)).not.toThrow();
  });

  it("refuses a database that already has people, writing nothing", async () => {
    await users.insert(test.db, {
      email: "alex@example.com",
      displayName: "Alex",
      avatarKey: null,
      role: "admin",
      color: 1,
      locale: null,
      onboardedAt: null,
    });
    await expect(
      seedDatabase(test.db, {
        publicUrl: "http://localhost:5173/",
        timeZone: "Europe/Paris",
      }),
    ).rejects.toThrow("empty database");
    expect(await test.db.selectFrom("user").selectAll().execute()).toHaveLength(
      1,
    );
    expect(await test.db.selectFrom("shares").selectAll().execute()).toEqual(
      [],
    );
  });
});

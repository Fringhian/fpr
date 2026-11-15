import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { violatedConstraint } from "./errors.js";
import { createTestDatabase, type TestDatabase } from "./testing.js";

let test: TestDatabase;

beforeAll(async () => {
  test = await createTestDatabase();
});

afterAll(async () => {
  await test.drop();
});

const share = {
  isin: "QZ0EXAMPLE16",
  name: "Example Fund",
  kind: "manual",
  tradingCurrency: null,
  providerSymbol: null,
  exchange: null,
  historyStartsOn: null,
  createdBy: null,
} as const;

describe("violatedConstraint", () => {
  it("names the unique constraint a duplicate violates", async () => {
    await test.db.insertInto("shares").values(share).execute();
    const error = await test.db
      .insertInto("shares")
      .values(share)
      .execute()
      .catch((caught: unknown) => caught);
    expect(violatedConstraint(error)).toBe("shares_isin_key");
  });

  it("names the foreign key a delete violates", async () => {
    const row = await test.db
      .selectFrom("shares")
      .select("id")
      .executeTakeFirstOrThrow();
    const person = await test.db
      .insertInto("user")
      .values({
        email: "alex@example.com",
        displayName: "Alex",
        avatarKey: null,
        role: "member",
        color: 1,
        locale: null,
        onboardedAt: null,
      })
      .returning("id")
      .executeTakeFirstOrThrow();
    await test.db
      .insertInto("portfolioChanges")
      .values({
        userId: person.id,
        shareId: row.id,
        quantityDelta: "1",
        effectiveAt: new Date("2026-03-02T10:00:00Z"),
        createdBy: person.id,
      })
      .execute();
    const error = await test.db
      .deleteFrom("shares")
      .where("id", "=", row.id)
      .execute()
      .catch((caught: unknown) => caught);
    expect(violatedConstraint(error)).toBe("portfolio_changes_share_id_fkey");
  });

  it("is nothing for any other error", () => {
    expect(violatedConstraint(new Error("boom"))).toBeUndefined();
    expect(violatedConstraint(undefined)).toBeUndefined();
    expect(
      violatedConstraint({ code: "42P01", constraint: "shares_isin_key" }),
    ).toBeUndefined();
  });
});

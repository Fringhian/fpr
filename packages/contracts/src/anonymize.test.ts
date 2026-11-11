import { describe, expect, expectTypeOf, it } from "vitest";
import { z } from "zod";
import { anonymizeKind, euro, personal, quantity } from "./anonymize.js";
import { decimalSchema } from "./decimal.js";

describe("anonymization marks", () => {
  it("marks a field personal, euro, or quantity", () => {
    expect(anonymizeKind(personal(z.string()))).toBe("personal");
    expect(anonymizeKind(euro(decimalSchema))).toBe("euro");
    expect(anonymizeKind(quantity(decimalSchema))).toBe("quantity");
  });

  it("leaves the shared schema unmarked", () => {
    euro(decimalSchema);
    expect(anonymizeKind(decimalSchema)).toBeUndefined();
  });

  it("keeps the schema's type and validation", () => {
    const amount = euro(decimalSchema);
    expectTypeOf(amount).toEqualTypeOf(decimalSchema);
    expect(amount.safeParse("12.50").success).toBe(true);
    expect(amount.safeParse("1e3").success).toBe(false);
  });

  it("finds the marks inside an object's shape", () => {
    const schema = z.object({
      name: personal(z.string()),
      balance: euro(decimalSchema),
      held: quantity(decimalSchema),
      color: z.int(),
    });
    const marks = Object.fromEntries(
      Object.entries(schema.shape).map(([key, field]) => [
        key,
        anonymizeKind(field),
      ]),
    );
    expect(marks).toEqual({
      name: "personal",
      balance: "euro",
      held: "quantity",
      color: undefined,
    });
  });
});

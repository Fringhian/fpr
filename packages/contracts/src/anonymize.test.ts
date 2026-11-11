import { describe, expect, expectTypeOf, it } from "vitest";
import { z } from "zod";
import { anonymizeKind, euro, personal, quantity } from "./anonymize.js";
import { apiContract } from "./api/index.js";
import { contractProcedures } from "./contract.js";
import { decimalSchema } from "./decimal.js";

/**
 * The euro fields of every object a schema holds, each with the fields beside
 * it, such as `["valueEur", ["quantity", "valueEur", "weight", "gain"]]`.
 */
function euroFields(schema: z.core.$ZodType): [string, string[]][] {
  const def = schema._zod.def as z.core.$ZodTypeDef & Record<string, unknown>;
  switch (def.type) {
    case "object": {
      const shape = def.shape as Record<string, z.core.$ZodType>;
      const keys = Object.keys(shape);
      return Object.entries(shape).flatMap(([key, field]) => [
        ...(anonymizeKind(field) === "euro"
          ? [[key, keys] as [string, string[]]]
          : []),
        ...euroFields(field),
      ]);
    }
    case "array":
      return euroFields(def.element as z.core.$ZodType);
    case "nullable":
    case "optional":
    case "default":
      return euroFields(def.innerType as z.core.$ZodType);
    case "union":
      return (def.options as z.core.$ZodType[]).flatMap(euroFields);
    default:
      return [];
  }
}

/** The percentage beside a euro field: `percent` for `eur`, a weight for `xEur`. */
function percentageBeside(key: string, keys: string[]): boolean {
  if (key === "eur") {
    return keys.includes("percent");
  }
  const weight = `${key.replace(/Eur$/, "")}Weight`;
  return keys.includes(weight) || keys.includes("weight");
}

describe("the euro amounts of every response", () => {
  const fields = contractProcedures(apiContract).flatMap(([path, procedure]) =>
    euroFields(procedure["~orpc"].outputSchema ?? z.never()).map(
      ([key, keys]) => ({ route: path.join("."), key, keys }),
    ),
  );

  it("exist", () => {
    expect(fields.length).toBeGreaterThan(0);
  });

  it.each(fields)(
    "have a percentage beside them, but a balance: $route › $key",
    ({ key, keys }) => {
      expect(key === "balanceEur" || percentageBeside(key, keys)).toBe(true);
    },
  );
});

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

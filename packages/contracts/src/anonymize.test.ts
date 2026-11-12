import { describe, expect, expectTypeOf, it } from "vitest";
import { z } from "zod";
import {
  type AnonymizeKind,
  anonymizeKind,
  euro,
  personal,
  quantity,
} from "./anonymize.js";
import { apiContract } from "./api/index.js";
import { contractProcedures } from "./contract.js";
import { decimalSchema } from "./decimal.js";
import { priceChangeSchema } from "./schemas/performance.js";

type Def = z.core.$ZodTypeDef & Record<string, unknown>;

/** The layers of a field: itself, then what its nullable, optional or default wraps. */
function layers(schema: z.core.$ZodType): z.core.$ZodType[] {
  const def = schema._zod.def as Def;
  return ["nullable", "optional", "default"].includes(def.type)
    ? [schema, ...layers(def.innerType as z.core.$ZodType)]
    : [schema];
}

/** How the anonymizer treats a field: the mark of its first marked layer. */
function kindOf(field: z.core.$ZodType): AnonymizeKind | undefined {
  return layers(field).map(anonymizeKind).find(Boolean);
}

interface Field {
  key: string;
  field: z.core.$ZodType;
  /** The keys of the object that holds it. */
  siblings: string[];
}

/**
 * Every field of the objects a schema holds. The fields of a schema in `skip`
 * are left out, with everything under them.
 */
function fieldsOf(
  schema: z.core.$ZodType,
  skip: ReadonlySet<z.core.$ZodType> = new Set(),
): Field[] {
  if (layers(schema).some((layer) => skip.has(layer))) {
    return [];
  }
  const def = schema._zod.def as Def;
  switch (def.type) {
    case "object": {
      const shape = def.shape as Record<string, z.core.$ZodType>;
      const siblings = Object.keys(shape);
      return Object.entries(shape).flatMap(([key, field]) => [
        ...(layers(field).some((layer) => skip.has(layer))
          ? []
          : [{ key, field, siblings }]),
        ...fieldsOf(field, skip),
      ]);
    }
    case "array":
      return fieldsOf(def.element as z.core.$ZodType, skip);
    case "nullable":
    case "optional":
    case "default":
      return fieldsOf(def.innerType as z.core.$ZodType, skip);
    case "union":
      return (def.options as z.core.$ZodType[]).flatMap((option) =>
        fieldsOf(option, skip),
      );
    default:
      return [];
  }
}

/**
 * What a field's name says the anonymizer does with it: the marks it may
 * carry, by the first rule its name matches. `undefined` is no mark.
 */
const nameRules: [name: RegExp, kinds: (AnonymizeKind | undefined)[]][] = [
  [/^(email|displayName|avatarUrl)$/, ["personal"]],
  [/^(percent|weight)$|(Percent|Weight)$/, [undefined]],
  [/^quantity|^cash|^amountEur$/, ["quantity"]],
  [/^eur$|Eur$/, ["euro", "quantity"]],
];

/**
 * Fields whose name matches a rule but which stay as they are for every
 * viewer: a share's prices and their change are market data.
 */
const marketDataNames = new Set(["priceEur", "previousPriceEur"]);
const marketDataSchemas = new Set<z.core.$ZodType>([priceChangeSchema]);

/** The rule a field breaks, or `undefined` when its mark fits its name. */
function nameRuleBroken({ key, field }: Field): string | undefined {
  if (marketDataNames.has(key)) {
    return kindOf(field) === undefined ? undefined : "market data is unmarked";
  }
  const rule = nameRules.find(([name]) => name.test(key));
  if (rule === undefined) {
    return undefined;
  }
  const [, kinds] = rule;
  return kinds.includes(kindOf(field))
    ? undefined
    : `expected ${kinds.map((kind) => kind ?? "no mark").join(" or ")}`;
}

const responseFields = contractProcedures(apiContract).flatMap(
  ([path, procedure]) =>
    fieldsOf(
      procedure["~orpc"].outputSchema ?? z.never(),
      marketDataSchemas,
    ).map((field) => ({ route: path.join("."), ...field })),
);

describe("every response field", () => {
  const named = responseFields.filter(
    ({ key }) =>
      marketDataNames.has(key) || nameRules.some(([name]) => name.test(key)),
  );

  it("exists among the fields a name rule covers", () => {
    expect(named.length).toBeGreaterThan(0);
  });

  it.each(named)("is marked as its name says: $route › $key", (field) => {
    expect(nameRuleBroken(field)).toBeUndefined();
  });
});

describe("a name rule", () => {
  const check = (schema: z.ZodObject) =>
    fieldsOf(schema, marketDataSchemas).map((field) => [
      field.key,
      nameRuleBroken(field),
    ]);

  it("finds an unmarked personal, euro, or quantity field", () => {
    const schema = z.object({
      email: z.email(),
      gainEur: decimalSchema,
      quantity: decimalSchema,
      cashEur: euro(decimalSchema),
      percent: euro(decimalSchema),
    });
    expect(check(schema)).toEqual([
      ["email", "expected personal"],
      ["gainEur", "expected euro or quantity"],
      ["quantity", "expected quantity"],
      ["cashEur", "expected quantity"],
      ["percent", "expected no mark"],
    ]);
  });

  it("looks inside arrays, unions, and nullable objects", () => {
    const schema = z.object({
      rows: z.array(
        z.union([
          z.object({ member: z.object({ displayName: z.string() }) }),
          z.object({ best: z.object({ valueEur: decimalSchema }).nullable() }),
        ]),
      ),
    });
    expect(check(schema).filter(([, broken]) => broken)).toEqual([
      ["displayName", "expected personal"],
      ["valueEur", "expected euro or quantity"],
    ]);
  });

  it("finds a mark on a field's nullable or inner layer", () => {
    const schema = z.object({
      avatarUrl: personal(z.url()).nullable(),
      email: personal(z.email().nullable()),
    });
    expect(check(schema)).toEqual([
      ["avatarUrl", undefined],
      ["email", undefined],
    ]);
  });

  it("leaves a share's prices and their change unmarked", () => {
    const schema = z.object({
      priceEur: euro(decimalSchema),
      change: priceChangeSchema,
    });
    expect(check(schema)).toEqual([["priceEur", "market data is unmarked"]]);
  });
});

describe("the euro amounts of every response", () => {
  const euros = responseFields.filter(({ field }) => kindOf(field) === "euro");

  it("exist", () => {
    expect(euros.length).toBeGreaterThan(0);
  });

  /** The percentage beside a euro field: `percent` for `eur`, a weight for `xEur`. */
  function percentageBeside({ key, siblings }: Field): boolean {
    if (key === "eur") {
      return siblings.includes("percent");
    }
    const weight = `${key.replace(/Eur$/, "")}Weight`;
    return siblings.includes(weight) || siblings.includes("weight");
  }

  it.each(euros)(
    "have a percentage beside them, but a balance: $route › $key",
    (field) => {
      expect(field.key === "balanceEur" || percentageBeside(field)).toBe(true);
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
});

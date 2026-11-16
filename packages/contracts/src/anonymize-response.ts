import { z } from "zod";
import { type AnonymizeKind, anonymizeKind } from "./anonymize.js";

type Fields = Record<string, unknown>;

/** What an anonymized response takes its replacements from. */
export interface AnonymizeReplacements {
  /** A person's pseudonym, from their id. */
  pseudonym: (id: string) => string;
  /**
   * The weights, in percent of the portfolio, of the entries whose quantity
   * has no weight beside it: by entry id, or by share id for a holding at a
   * moment.
   */
  weights: ReadonlyMap<string, string>;
}

const removed = Symbol("removed");

/**
 * The weight that replaces a quantity or cash field: the `weight` beside a
 * holding's `quantity`, the `cashWeight` beside `cashEur`, or the weight of
 * the entry, or the share, the object stands for.
 */
function weightOf(
  fields: Fields,
  key: string,
  weights: ReadonlyMap<string, string>,
): unknown {
  if (key === "quantity" && "weight" in fields) {
    return fields.weight;
  }
  if (key === "cashEur") {
    return fields.cashWeight;
  }
  const share = fields.share as { id?: unknown } | undefined;
  const id = typeof fields.id === "string" ? fields.id : share?.id;
  return typeof id === "string" ? (weights.get(id) ?? null) : null;
}

function replace(
  kind: AnonymizeKind,
  value: unknown,
  parent: Fields,
  key: string,
  replacements: AnonymizeReplacements,
): unknown {
  switch (kind) {
    case "personal":
      // A display name becomes the pseudonym of the person it sits beside.
      return key === "displayName" && typeof parent.id === "string"
        ? replacements.pseudonym(parent.id)
        : null;
    case "euro":
      return removed;
    case "quantity":
      return value === null
        ? null
        : weightOf(parent, key, replacements.weights);
  }
}

function walkObject(
  value: unknown,
  shape: Record<string, z.core.$ZodType>,
  replacements: AnonymizeReplacements,
): unknown {
  if (typeof value !== "object" || value === null) {
    return value;
  }
  const fields = value as Fields;
  const result: Fields = {};
  for (const [key, field] of Object.entries(fields)) {
    const schema = shape[key];
    const walked =
      schema === undefined
        ? field
        : walk(field, schema, replacements, fields, key);
    if (walked !== removed) {
      result[key] = walked;
    }
  }
  return result;
}

function walkInner(
  value: unknown,
  def: z.core.$ZodTypeDef & Fields,
  replacements: AnonymizeReplacements,
  parent: Fields,
  key: string,
): unknown {
  switch (def.type) {
    case "object":
      return walkObject(
        value,
        def.shape as Record<string, z.core.$ZodType>,
        replacements,
      );
    case "array":
      return Array.isArray(value)
        ? value.map((item) =>
            walk(
              item,
              def.element as z.core.$ZodType,
              replacements,
              parent,
              key,
            ),
          )
        : value;
    case "union": {
      const option = (def.options as z.core.$ZodType[]).find(
        (candidate) => z.safeParse(candidate, value).success,
      );
      return option === undefined
        ? value
        : walk(value, option, replacements, parent, key);
    }
    case "nullable":
    case "optional":
    case "default":
    case "prefault":
    case "readonly":
    case "nonoptional":
      return value === null || value === undefined
        ? value
        : walk(
            value,
            def.innerType as z.core.$ZodType,
            replacements,
            parent,
            key,
          );
    case "pipe":
      return walk(value, def.out as z.core.$ZodType, replacements, parent, key);
    default:
      return value;
  }
}

function walk(
  value: unknown,
  schema: z.core.$ZodType,
  replacements: AnonymizeReplacements,
  parent: Fields,
  key: string,
): unknown {
  const kind = anonymizeKind(schema);
  if (kind !== undefined) {
    return replace(kind, value, parent, key, replacements);
  }
  const def = schema._zod.def as z.core.$ZodTypeDef & Fields;
  return walkInner(value, def, replacements, parent, key);
}

/**
 * A response as an anonymous viewer gets it, from the marks of its contract
 * schema: display names become pseudonyms, pictures and emails `null`,
 * amounts in euros are removed, and quantities and cash become their weight.
 * The value is the response the schema validated, and is left unchanged.
 */
export function anonymizeResponse(
  value: unknown,
  schema: z.core.$ZodType,
  replacements: AnonymizeReplacements,
): unknown {
  const root = walk(value, schema, replacements, {}, "");
  return root === removed ? undefined : root;
}

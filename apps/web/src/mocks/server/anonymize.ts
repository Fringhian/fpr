import { type AnonymizeKind, anonymizeKind } from "@fpr/contracts";
import { z } from "zod";

type Fields = Record<string, unknown>;

/** What the anonymizer puts in place of a marked field. */
export type Replacements = {
  /** A person's pseudonym, from their id. */
  pseudonym: (id: string) => string;
  /** The weight in percent that replaces a quantity or cash field of `fields`. */
  weight: (fields: Fields, key: string) => unknown;
};

const removed = Symbol("removed");

function replace(
  kind: AnonymizeKind,
  value: unknown,
  parent: Fields,
  key: string,
  replacements: Replacements,
): unknown {
  switch (kind) {
    case "personal":
      // A display name becomes the person's pseudonym; a picture or an email, nothing.
      return key === "displayName" && typeof parent.id === "string"
        ? replacements.pseudonym(parent.id)
        : null;
    case "euro":
      return removed;
    case "quantity":
      return value === null ? null : replacements.weight(parent, key);
  }
}

function walkObject(
  value: unknown,
  shape: Record<string, z.core.$ZodType>,
  replacements: Replacements,
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

function walk(
  value: unknown,
  schema: z.core.$ZodType,
  replacements: Replacements,
  parent: Fields,
  key: string,
): unknown {
  const kind = anonymizeKind(schema);
  if (kind !== undefined) {
    return replace(kind, value, parent, key, replacements);
  }
  const def = schema._zod.def as z.core.$ZodTypeDef & Record<string, unknown>;
  switch (def.type) {
    case "object":
      return walkObject(
        value,
        (schema as z.core.$ZodObject)._zod.def.shape,
        replacements,
      );
    case "array":
      return Array.isArray(value)
        ? value.map((item) =>
            walk(
              item,
              (schema as z.core.$ZodArray)._zod.def.element,
              replacements,
              parent,
              key,
            ),
          )
        : value;
    case "union": {
      const option = (schema as z.core.$ZodUnion)._zod.def.options.find(
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

/**
 * A response as an anonymous viewer gets it, from the marks of its contract
 * schema: display names become pseudonyms, pictures and emails nothing,
 * amounts in euros are removed, and quantities and cash become their weight.
 */
export function anonymize(
  value: unknown,
  schema: z.core.$ZodType,
  replacements: Replacements,
): unknown {
  const root = walk(value, schema, replacements, {}, "");
  return root === removed ? undefined : root;
}

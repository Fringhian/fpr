import { z } from "zod";

/**
 * What the anonymizer replaces in a field, for an anonymous viewer:
 * - `personal`: a display name, picture, or email;
 * - `euro`: an amount or series in euros, replaced with percentages;
 * - `quantity`: a quantity held, or cash, replaced with its weight in the
 *   portfolio.
 */
export const anonymizeKinds = ["personal", "euro", "quantity"] as const;

export type AnonymizeKind = (typeof anonymizeKinds)[number];

export interface AnonymizeMeta {
  kind: AnonymizeKind;
}

/** Holds the mark of every field the anonymizer replaces. */
export const anonymizeRegistry = z.registry<AnonymizeMeta>();

/**
 * Marks a copy of the schema, so a shared schema such as `decimalSchema` is
 * marked only where the field is used.
 */
function mark<T extends z.ZodType>(schema: T, kind: AnonymizeKind): T {
  const marked = schema.clone();
  anonymizeRegistry.add(marked, { kind });
  return marked;
}

/** A display name, picture, or email. */
export function personal<T extends z.ZodType>(schema: T): T {
  return mark(schema, "personal");
}

/** An amount or series in euros. */
export function euro<T extends z.ZodType>(schema: T): T {
  return mark(schema, "euro");
}

/** A quantity held, or cash. */
export function quantity<T extends z.ZodType>(schema: T): T {
  return mark(schema, "quantity");
}

/** How the anonymizer treats a schema, or `undefined` when it keeps it. */
export function anonymizeKind(
  schema: z.core.$ZodType,
): AnonymizeKind | undefined {
  return anonymizeRegistry.get(schema)?.kind;
}

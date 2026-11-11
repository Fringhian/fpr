import { z } from "zod";
import { euro } from "../../anonymize.js";
import { decimalSchema } from "../../decimal.js";
import { shareSummarySchema } from "../../schemas/share.js";
import { dateSchema } from "../../schemas/time.js";

/** Marks a schema as an amount in the response's unit, or leaves it as it is. */
type MarkInUnit = <T extends z.ZodType>(schema: T) => T;

const keep: MarkInUnit = (schema) => schema;

/**
 * A response whose gains are in the `unit` the request asks for, and says
 * which: `{ unit: "eur", ... }` or `{ unit: "percent", ... }`.
 *
 * `build` gets the function that marks each gain: `euro()` in the `eur`
 * branch, nothing in the `percent` branch. Each branch has its own schemas, so
 * the anonymizer and the OpenAPI document see euro gains as euros and
 * percentages as percentages. An anonymous viewer is answered in `percent`
 * whatever `unit` asks, so no euro gain reaches them.
 */
export function byUnit<Shape extends z.ZodRawShape>(
  build: (inUnit: MarkInUnit) => Shape,
) {
  return z.discriminatedUnion("unit", [
    z.object({ unit: z.literal("eur") }).extend(build(euro)),
    z.object({ unit: z.literal("percent") }).extend(build(keep)),
  ]);
}

/** The day of the last close: leaderboards and gains are as of it. */
export const lastCloseOnSchema = dateSchema;

/**
 * The day of the member's first entry when it is after the period's start:
 * their gain is measured from it, and the web app shows "since <day>". `null`
 * when the member's history covers the whole period.
 */
export const measuredFromSchema = dateSchema.nullable();

/**
 * `true` when the member holds a share whose prices haven't arrived yet: they
 * are measured on the shares that have a price, and their row is marked
 * incomplete.
 */
export const incompleteSchema = z.boolean();

/**
 * The member's holding with the largest gain over the period, in percent, or
 * `null` when they held no priced share over it.
 */
export const bestHoldingSchema = z
  .object({
    share: shareSummarySchema,
    gainPercent: decimalSchema,
  })
  .nullable();

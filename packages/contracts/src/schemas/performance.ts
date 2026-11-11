import { z } from "zod";
import { dateSchema } from "./time.js";

/**
 * `true` when the member holds a share whose prices haven't arrived yet: their
 * balance leaves it out, and is marked incomplete.
 */
export const incompleteSchema = z.boolean();

/**
 * The day of the member's first share change or cash balance, or `null` when
 * they have none yet.
 */
export const firstEntryOnSchema = dateSchema.nullable();

/**
 * The day of the member's first entry when it is after the period's start:
 * their gain is measured from it, and the web app shows "since <day>". `null`
 * when the member's history covers the whole period.
 */
export const measuredFromSchema = dateSchema.nullable();

import { z } from "zod";
import { euro, quantity } from "../anonymize.js";
import { decimalSchema } from "../decimal.js";
import { percentSchema } from "./money.js";
import { dateSchema, timestampSchema } from "./time.js";

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

/**
 * A gain in euros and in percent of the value at its start. The anonymizer
 * removes `eur` and keeps `percent`, which is `null` when the value at the
 * start is zero.
 */
export const gainSchema = z.object({
  eur: euro(decimalSchema),
  percent: percentSchema.nullable(),
});

export type Gain = z.infer<typeof gainSchema>;

/**
 * A holding: the quantity held, its value with its weight in percent of the
 * holder's balance, and its gain. The value, weight, and gain are `null` while
 * the share has no price yet. The anonymizer removes the value and the gain in
 * euros, and replaces the quantity with the weight.
 */
export const positionSchema = z.object({
  quantity: quantity(decimalSchema),
  valueEur: euro(decimalSchema.nullable()),
  weight: percentSchema.nullable(),
  /** Over the period in a portfolio, since bought on a share's page. */
  gain: gainSchema.nullable(),
});

export type Position = z.infer<typeof positionSchema>;

/**
 * A share's price change over a period, for one unit, in euros and in
 * percent. Share prices are market data, so the anonymizer keeps both.
 */
export const priceChangeSchema = z.object({
  eur: decimalSchema,
  percent: percentSchema,
});

export type PriceChange = z.infer<typeof priceChangeSchema>;

/**
 * A member's balance at a moment, a close at 23:59:59 of its day or a
 * refresh, with their gain since the period's start. A member's balance has
 * no percentage: the anonymizer removes it, and the gain's percentage draws
 * the curve.
 */
export const memberSeriesPointSchema = z.object({
  at: timestampSchema,
  /** Holdings × their value at the moment, plus cash. */
  balanceEur: euro(decimalSchema),
  gain: gainSchema,
  /** `true` for a refresh after the last close: today's points, not final. */
  provisional: z.boolean(),
  incomplete: incompleteSchema,
});

export type MemberSeriesPoint = z.infer<typeof memberSeriesPointSchema>;

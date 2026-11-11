import { z } from "zod";
import { euro, quantity } from "../../anonymize.js";
import { errorMap, signedInRoute } from "../../contract.js";
import { decimalSchema } from "../../decimal.js";
import { periodSchema } from "../../period.js";
import { roles } from "../../roles.js";
import { idSchema } from "../../schemas/ids.js";
import { pricePointSchema, shareSummarySchema } from "../../schemas/share.js";
import { dateSchema, timestampSchema } from "../../schemas/time.js";

/** A weight in percent of the portfolio's balance, such as `42.5`. */
const weightSchema = decimalSchema;

/** A gain over the period, in euros and in percent of the value at its start. */
export const portfolioGainSchema = z.object({
  eur: euro(decimalSchema),
  /** `null` when the value at the start is zero. */
  percent: decimalSchema.nullable(),
});

export type PortfolioGain = z.infer<typeof portfolioGainSchema>;

/**
 * A share the member holds. A held market share whose prices haven't arrived
 * yet is pending: its `latestPrice`, `valueEur`, `weight` and `gain` are
 * `null`, and its holder's balance leaves it out.
 */
export const portfolioHoldingSchema = z.object({
  share: shareSummarySchema,
  quantity: quantity(decimalSchema),
  /** The latest price with its moment, the "as of" of a manual share, or `null` while pending. */
  latestPrice: pricePointSchema.nullable(),
  valueEur: euro(decimalSchema.nullable()),
  weight: weightSchema.nullable(),
  /**
   * The value at the end, minus the value at the start, minus the shares
   * added, plus the shares removed, each at its day's price.
   */
  gain: portfolioGainSchema.nullable(),
  /** The day the share's prices start, when the holding starts before it. Earlier days are valued at that day's close. */
  pricesFrom: dateSchema.nullable(),
  /** The share's prices over the period, oldest first, for a small chart. */
  series: z.array(pricePointSchema),
});

export type PortfolioHolding = z.infer<typeof portfolioHoldingSchema>;

/** A member's portfolio: their holdings, cash, and balance now. */
export const portfolioSchema = z.object({
  /** The moment of the latest prices the balance uses, or `null` with no priced holding. */
  pricesAt: timestampSchema.nullable(),
  /** Holdings plus cash. */
  balanceEur: euro(decimalSchema),
  /** The holdings' value. */
  sharesEur: euro(decimalSchema),
  cashEur: quantity(decimalSchema),
  cashWeight: weightSchema.nullable(),
  /** The balance's gain over the period. */
  gain: portfolioGainSchema,
  /** The member's first share change or cash balance, or `null` with no entries yet. */
  firstEntryAt: timestampSchema.nullable(),
  /** `true` when the first entry is after the period's start: the gain is measured from it. */
  measuredFromFirstEntry: z.boolean(),
  /** `true` while a holding is pending: the balance leaves it out. */
  incomplete: z.boolean(),
  /** The holdings above zero. */
  holdings: z.array(portfolioHoldingSchema),
});

export type Portfolio = z.infer<typeof portfolioSchema>;

export const getPortfolio = signedInRoute(roles)
  .route({
    method: "GET",
    path: "/users/{userId}/portfolio",
    summary: "A member's holdings, cash and balance",
  })
  .input(z.object({ userId: idSchema, period: periodSchema }))
  .output(portfolioSchema)
  .errors(errorMap("invalid_request", "not_found"));

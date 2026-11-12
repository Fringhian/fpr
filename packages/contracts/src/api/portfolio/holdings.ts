import { z } from "zod";
import { euro, quantity } from "../../anonymize.js";
import { errorMap, signedInRoute } from "../../contract.js";
import { decimalSchema } from "../../decimal.js";
import { periodSchema } from "../../period.js";
import { roles } from "../../roles.js";
import { idSchema } from "../../schemas/ids.js";
import { percentSchema } from "../../schemas/money.js";
import {
  firstEntryOnSchema,
  gainSchema,
  incompleteSchema,
  measuredFromSchema,
  positionSchema,
} from "../../schemas/performance.js";
import {
  latestPriceSchema,
  pricePointSchema,
  shareSummarySchema,
} from "../../schemas/share.js";
import { dateSchema, timestampSchema } from "../../schemas/time.js";

/**
 * A share the member holds, and their position on it: its gain is over the
 * period, the value at the end, minus the value at the start, minus the shares
 * added, plus the shares removed, each at its day's price. A held market share
 * whose prices haven't arrived yet is pending: its `latestPrice`, `valueEur`,
 * `weight` and `gain` are `null`, and its holder's balance leaves it out.
 */
export const portfolioHoldingSchema = positionSchema.extend({
  share: shareSummarySchema,
  /** The latest price with its time and source, or `null` while pending. */
  latestPrice: latestPriceSchema.nullable(),
  /** The day the share's prices start, when the holding starts before it. Earlier days are valued at that day's close. */
  pricesFrom: dateSchema.nullable(),
  /** The share's prices over the period, oldest first, for a small chart. */
  series: z.array(pricePointSchema),
});

export type PortfolioHolding = z.infer<typeof portfolioHoldingSchema>;

/**
 * A member's portfolio: their holdings, cash, and balance now. Each amount in
 * euros has its weight in percent of the balance beside it, but the balance,
 * which the anonymizer removes.
 */
export const portfolioSchema = z.object({
  /** The time of the latest prices the balance uses, or `null` with no priced holding. */
  latestPricesAt: timestampSchema.nullable(),
  /** Holdings plus cash. */
  balanceEur: euro(decimalSchema),
  /** The holdings' value. */
  sharesEur: euro(decimalSchema),
  /** The holdings' weight, or `null` while the balance is zero. */
  sharesWeight: percentSchema.nullable(),
  cashEur: quantity(decimalSchema),
  /** The cash's weight, or `null` while the balance is zero. */
  cashWeight: percentSchema.nullable(),
  /** The balance's gain over the period. */
  gain: gainSchema,
  firstEntryOn: firstEntryOnSchema,
  measuredFrom: measuredFromSchema,
  incomplete: incompleteSchema,
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

/**
 * `GET /users/{userId}/holdings/{shareId}?at=`: the member, the share, and the
 * moment, with its offset percent-encoded in the query, such as
 * `2026-03-02T17%3A30%3A00%2B01%3A00`.
 */
export const portfolioHoldingAtQuerySchema = z.object({
  userId: idSchema,
  shareId: idSchema,
  at: timestampSchema,
});

export type PortfolioHoldingAtQuery = z.infer<
  typeof portfolioHoldingAtQuerySchema
>;

/** The quantity of a share a member held at a moment: zero when they held none. */
export const portfolioHoldingAtSchema = z.object({
  share: shareSummarySchema,
  at: timestampSchema,
  quantity: quantity(decimalSchema),
});

export type PortfolioHoldingAt = z.infer<typeof portfolioHoldingAtSchema>;

/**
 * What a sale can remove: the sum of the member's share changes on the share
 * up to `at`. Answers `not_found` for an unknown person or share, or a person
 * with no portfolio.
 */
export const getPortfolioHoldingAt = signedInRoute(roles)
  .route({
    method: "GET",
    path: "/users/{userId}/holdings/{shareId}",
    summary: "The quantity of a share a member held at a moment",
  })
  .input(portfolioHoldingAtQuerySchema)
  .output(portfolioHoldingAtSchema)
  .errors(errorMap("invalid_request", "not_found"));

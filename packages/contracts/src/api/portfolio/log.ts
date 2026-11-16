import { z } from "zod";
import { quantity } from "../../anonymize.js";
import { errorMap, signedInRoute } from "../../contract.js";
import { decimalSchema } from "../../decimal.js";
import { roles } from "../../roles.js";
import { idSchema } from "../../schemas/ids.js";
import {
  portfolioCashAmountSchema,
  portfolioCashBalanceSchema,
} from "./cash.js";
import { portfolioChangeSchema } from "./changes.js";

/**
 * A share change or a cash balance, told apart by `type`, with what it
 * changed: the quantity of the share held just after a change, and the cash
 * just before a balance, `null` before the first. Entries at the same moment
 * count in the order they were recorded.
 */
export const portfolioLogEntrySchema = z.discriminatedUnion("type", [
  portfolioChangeSchema.extend({
    quantityAfter: quantity(decimalSchema),
  }),
  portfolioCashBalanceSchema.extend({
    previousAmountEur: quantity(portfolioCashAmountSchema.nullable()),
  }),
]);

export type PortfolioLogEntry = z.infer<typeof portfolioLogEntrySchema>;

/** A page of the log: entries by `effectiveAt`, newest first. */
export const portfolioLogSchema = z.object({
  entries: z.array(portfolioLogEntrySchema),
  /** The `before` of the next page, or `null` on the last page. */
  nextBefore: z.string().min(1).nullable(),
  /** How many entries the whole log holds. */
  total: z.int().min(0),
});

export type PortfolioLog = z.infer<typeof portfolioLogSchema>;

/** `GET /users/{userId}/log?limit=&before=`. */
export const portfolioLogQuerySchema = z.object({
  userId: idSchema,
  /** Entries per page: 50 by default, 100 at most. */
  limit: z.coerce.number().int().min(1).max(100).default(50),
  /** The `nextBefore` of the previous page. Omitted for the first page. */
  before: z.string().min(1).optional(),
});

export type PortfolioLogQuery = z.input<typeof portfolioLogQuerySchema>;

export const getPortfolioLog = signedInRoute(roles)
  .route({
    method: "GET",
    path: "/users/{userId}/log",
    summary: "A member's share changes and cash balances, newest first",
  })
  .input(portfolioLogQuerySchema)
  .output(portfolioLogSchema)
  .errors(errorMap("invalid_request", "not_found"));

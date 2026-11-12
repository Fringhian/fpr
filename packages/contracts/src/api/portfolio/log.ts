import { z } from "zod";
import { errorMap, signedInRoute } from "../../contract.js";
import { roles } from "../../roles.js";
import { idSchema } from "../../schemas/ids.js";
import { portfolioCashBalanceSchema } from "./cash.js";
import { portfolioChangeSchema } from "./changes.js";

/** A share change or a cash balance, told apart by `type`. */
export const portfolioLogEntrySchema = z.discriminatedUnion("type", [
  portfolioChangeSchema,
  portfolioCashBalanceSchema,
]);

export type PortfolioLogEntry = z.infer<typeof portfolioLogEntrySchema>;

/** A page of the log: entries by `effectiveAt`, newest first. */
export const portfolioLogSchema = z.object({
  entries: z.array(portfolioLogEntrySchema),
  /** The `before` of the next page, or `null` on the last page. */
  nextBefore: z.string().min(1).nullable(),
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

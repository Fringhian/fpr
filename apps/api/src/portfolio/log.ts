import type {
  PortfolioLog,
  PortfolioLogEntry,
  PortfolioLogEntryQuery,
} from "@fpr/contracts";
import { type Db, portfolioLog } from "@fpr/db";
import { apiError } from "../errors.js";
import { toLogEntry } from "./entries.js";
import { findPortfolioOwner } from "./owner.js";

/**
 * `GET /users/{userId}/log`: a page of share changes and cash balances,
 * newest first. A `before` the log didn't give is `invalid_request`.
 */
export async function logPage(
  db: Db,
  input: { userId: string; limit: number; before?: string | undefined },
): Promise<PortfolioLog> {
  if (input.before !== undefined && !portfolioLog.isCursor(input.before)) {
    throw apiError("invalid_request", {
      issues: [{ path: ["before"], code: "invalid_format" }],
    });
  }
  await findPortfolioOwner(db, input.userId);
  // One more than the page shows whether another page follows.
  const [rows, total] = await Promise.all([
    portfolioLog.page(db, input.userId, {
      limit: input.limit + 1,
      before: input.before,
    }),
    portfolioLog.count(db, input.userId),
  ]);
  const entries = rows.slice(0, input.limit);
  return {
    entries: entries.map(toLogEntry),
    nextBefore:
      rows.length > input.limit ? (entries.at(-1)?.cursor ?? null) : null,
    total,
  };
}

/** `GET /users/{userId}/log/{entryId}`. */
export async function logEntry(
  db: Db,
  input: PortfolioLogEntryQuery,
): Promise<PortfolioLogEntry> {
  await findPortfolioOwner(db, input.userId);
  const row = await portfolioLog.find(db, input.userId, input.entryId);
  if (row === undefined) {
    throw apiError("not_found");
  }
  return toLogEntry(row);
}

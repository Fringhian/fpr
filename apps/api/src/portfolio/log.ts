import {
  type PortfolioLog,
  type PortfolioLogEntry,
  type PortfolioLogEntryQuery,
  Role,
} from "@fpr/contracts";
import { type Db, portfolioLog } from "@fpr/db";
import { apiError } from "../errors.js";
import type { Viewer } from "../pipeline/index.js";
import { toLogEntry } from "./entries.js";
import { findPortfolioOwner } from "./owner.js";

/** What the log routes read with, and the anonymizer's weights they fill. */
export interface LogContext {
  db: Db;
  viewer: Viewer;
  quantityWeights: Map<string, string>;
}

/**
 * For an anonymous viewer, each entry's weight in the balance at its moment,
 * which replaces its quantities and cash: a log entry has no weight beside
 * them.
 */
export async function weighEntries(
  { db, viewer, quantityWeights }: LogContext,
  userId: string,
  ids: string[],
): Promise<void> {
  if (viewer.role !== Role.anonymous) {
    return;
  }
  for (const [id, weight] of await portfolioLog.weights(db, userId, ids)) {
    quantityWeights.set(id, weight);
  }
}

/**
 * `GET /users/{userId}/log`: a page of share changes and cash balances,
 * newest first. A `before` the log didn't give is `invalid_request`.
 */
export async function logPage(
  context: LogContext,
  input: { userId: string; limit: number; before?: string | undefined },
): Promise<PortfolioLog> {
  const { db } = context;
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
  await weighEntries(
    context,
    input.userId,
    entries.map(({ id }) => id),
  );
  return {
    entries: entries.map(toLogEntry),
    nextBefore:
      rows.length > input.limit ? (entries.at(-1)?.cursor ?? null) : null,
    total,
  };
}

/** `GET /users/{userId}/log/{entryId}`. */
export async function logEntry(
  context: LogContext,
  input: PortfolioLogEntryQuery,
): Promise<PortfolioLogEntry> {
  await findPortfolioOwner(context.db, input.userId);
  const row = await portfolioLog.find(context.db, input.userId, input.entryId);
  if (row === undefined) {
    throw apiError("not_found");
  }
  await weighEntries(context, input.userId, [row.id]);
  return toLogEntry(row);
}

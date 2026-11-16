import type { Id, PortfolioLogEntry } from "@fpr/contracts";
import Big from "big.js";
import type { TimelineEntry } from "../../../components/molecules/timeline-row/timeline-row";
import { changeSummaryOf } from "../../../lib/log-entry";

/**
 * One entry of the log as a timeline row draws it, with the entry itself for
 * its actions, and who made it when that wasn't the portfolio's owner.
 */
export type LogRow = {
  entry: PortfolioLogEntry;
  row: TimelineEntry;
  madeBy: string | undefined;
};

function rowOf(entry: PortfolioLogEntry): TimelineEntry {
  if (entry.type === "cash") {
    return {
      kind: "cashSet",
      amount: entry.amountEur,
      before: entry.previousAmountEur,
    };
  }
  return {
    ...changeSummaryOf(entry),
    before: new Big(entry.quantityAfter).minus(entry.quantityDelta).toFixed(),
    after: entry.quantityAfter,
  };
}

/**
 * The log's entries of `ownerId`'s portfolio as timeline rows, newest first:
 * each change with the quantity held before and after it, each cash balance
 * with the cash before it.
 */
export function logRows(
  entries: readonly PortfolioLogEntry[],
  ownerId: Id,
): LogRow[] {
  return entries.map((entry) => ({
    entry,
    row: rowOf(entry),
    madeBy:
      entry.madeBy !== null && entry.madeBy.id !== ownerId
        ? entry.madeBy.displayName
        : undefined,
  }));
}

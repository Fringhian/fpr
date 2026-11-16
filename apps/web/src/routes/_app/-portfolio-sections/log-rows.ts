import type {
  Decimal,
  Id,
  PortfolioHolding,
  PortfolioLogEntry,
} from "@fpr/contracts";
import Big from "big.js";
import type { TimelineEntry } from "../../../components/molecules/timeline-row/timeline-row";
import { changeSummaryOf } from "../../../lib/log-entry";

/** One entry of the log as a timeline row draws it, with the entry itself for its actions. */
export type LogRow = {
  entry: PortfolioLogEntry;
  row: TimelineEntry;
};

function cashBefore(
  entries: readonly PortfolioLogEntry[],
  complete: boolean,
): Map<Id, Decimal | null | undefined> {
  const before = new Map<Id, Decimal | null | undefined>();
  let older: Decimal | null | undefined = complete ? null : undefined;
  for (const entry of entries.toReversed()) {
    if (entry.type === "cash") {
      before.set(entry.id, older);
      older = entry.amountEur;
    }
  }
  return before;
}

/**
 * The log's entries as timeline rows, newest first. A log has no running
 * quantities, so each change's before → after is read backwards from what is
 * held now: `holdings` are the holdings above zero, and the loaded entries
 * are every entry newer than the oldest one. A cash balance was the next
 * older one; with none loaded, it is the first cash entry when `complete`
 * says the log has no older page, and isn't known yet otherwise.
 */
export function logRows(
  entries: readonly PortfolioLogEntry[],
  holdings: readonly Pick<PortfolioHolding, "share" | "quantity">[],
  complete: boolean,
): LogRow[] {
  const held = new Map<Id, Big>(
    holdings.map(({ share, quantity }) => [share.id, new Big(quantity)]),
  );
  const cash = cashBefore(entries, complete);
  return entries.map((entry): LogRow => {
    if (entry.type === "cash") {
      const before = cash.get(entry.id);
      return {
        entry,
        row: { kind: "cashSet", amount: entry.amountEur, before },
      };
    }
    const after = held.get(entry.share.id) ?? new Big(0);
    const before = after.minus(entry.quantityDelta);
    held.set(entry.share.id, before);
    return {
      entry,
      row: {
        ...changeSummaryOf(entry),
        before: before.toFixed(),
        after: after.toFixed(),
      },
    };
  });
}

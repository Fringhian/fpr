import type {
  Decimal,
  Id,
  IsoDate,
  PortfolioLogEntry,
  Timestamp,
} from "@fpr/contracts";
import Big from "big.js";
import { isPositive } from "../../../lib/amount";
import { type EntrySummary, entrySummaryOf } from "../../../lib/log-entry";
import { momentOfDay, raceDayOf } from "../../../lib/race-day";
import type { RecordKind, RecordSearch } from "../../../lib/record-search";

/**
 * The change being recorded, from the address, else from the entry it
 * edits: what, which share, which day, and how many or how much. The day is
 * today until one is picked.
 */
export type Draft = {
  kind?: RecordKind | undefined;
  shareId?: Id | undefined;
  day: IsoDate;
  /** The day was picked, or comes from the edited entry, rather than today's by default. */
  dayChosen: boolean;
  /** Units bought or sold, above zero, or the cash in euros. */
  amount?: Decimal | undefined;
  /** The share change or cash balance edited, or nothing for a new one. */
  entry?: PortfolioLogEntry | undefined;
};

const KINDS = {
  bought: "buy",
  sold: "sell",
  cashSet: "cash",
} as const satisfies Record<EntrySummary["kind"], RecordKind>;

function answersOf(entry: PortfolioLogEntry) {
  const summary = entrySummaryOf(entry);
  return {
    kind: KINDS[summary.kind],
    amount: summary.kind === "cashSet" ? summary.amount : summary.quantity,
  };
}

/**
 * The draft from the address and the edited entry. A day after today, or an
 * amount the kind can't take (zero or less for shares, below zero for cash),
 * is dropped, so the flow asks for it again.
 */
export function draftOf(
  search: RecordSearch,
  entry: PortfolioLogEntry | undefined,
  today: IsoDate,
): Draft {
  const edited = entry && answersOf(entry);
  const kind = search.kind ?? edited?.kind;
  const day =
    search.day !== undefined && search.day <= today ? search.day : undefined;
  const amount =
    search.amount !== undefined && isPositive(search.amount, kind === "cash")
      ? search.amount
      : undefined;
  return {
    kind,
    shareId:
      search.share ?? (entry?.type === "change" ? entry.share.id : undefined),
    day: day ?? (entry ? raceDayOf(entry.effectiveAt) : today),
    dayChosen: day !== undefined || entry !== undefined,
    amount: amount ?? edited?.amount,
    entry,
  };
}

/**
 * The moment a change on `day` is saved at, `momentOfDay`'s, so it counts
 * in that day's close and every holding read on it. An edit kept on its day
 * keeps its own moment.
 */
export function momentOf(draft: Draft, today: IsoDate): Timestamp {
  if (draft.entry && raceDayOf(draft.entry.effectiveAt) === draft.day) {
    return draft.entry.effectiveAt;
  }
  return momentOfDay(draft.day, today);
}

/**
 * What a holding read on the draft's day counts that the change doesn't
 * change: the edited change's own units, when it falls by then.
 */
export function heldBesides(
  held: Decimal,
  draft: Draft,
  at: Timestamp,
): Decimal {
  const { entry } = draft;
  if (
    entry?.type !== "change" ||
    entry.share.id !== draft.shareId ||
    Date.parse(entry.effectiveAt) > Date.parse(at)
  ) {
    return held;
  }
  return new Big(held).minus(entry.quantityDelta).toFixed();
}

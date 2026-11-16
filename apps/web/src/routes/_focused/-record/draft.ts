import type {
  Decimal,
  Id,
  IsoDate,
  PortfolioLogEntry,
  Timestamp,
} from "@fpr/contracts";
import Big from "big.js";
import { localInstant, raceDayEnd, raceDayOf } from "../../../lib/race-day";
import type { RecordKind, RecordSearch } from "../../../lib/record-search";
import { isPositive } from "./amount";

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

function kindOf(entry: PortfolioLogEntry): RecordKind {
  if (entry.type === "cash") return "cash";
  return entry.quantityDelta.startsWith("-") ? "sell" : "buy";
}

function amountOf(entry: PortfolioLogEntry): Decimal {
  return entry.type === "cash"
    ? entry.amountEur
    : entry.quantityDelta.replace(/^-/, "");
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
  const kind = search.kind ?? (entry && kindOf(entry));
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
    amount: amount ?? (entry && amountOf(entry)),
    entry,
  };
}

// How far before the device's clock a change made today is dated, so a clock
// a little ahead of the API's never makes it a future moment.
const CLOCK_MARGIN_MS = 60_000;

/**
 * The moment a change on `day` is saved at: a minute ago for today, but
 * never before the day starts; a past day's last second for another, so it
 * counts in that day's close and every holding read on it. An edit kept on
 * its day keeps its own moment.
 */
export function momentOf(draft: Draft, today: IsoDate): Timestamp {
  if (draft.entry && raceDayOf(draft.entry.effectiveAt) === draft.day) {
    return draft.entry.effectiveAt;
  }
  if (draft.day !== today) return raceDayEnd(draft.day);
  const dayStart = localInstant(today, "00:00:00");
  return new Date(
    Math.max(Date.now() - CLOCK_MARGIN_MS, dayStart),
  ).toISOString();
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

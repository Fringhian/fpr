import type { Decimal, Id, IsoDate } from "@fpr/contracts";
import { decimalPattern } from "@fpr/contracts/values";
import type { SearchSchemaInput } from "@tanstack/react-router";
import { oneOf } from "./one-of";
import { idIn } from "./view-state/view-search";

/** What Record a change records: a purchase or a sale of `share`, or cash. */
export const recordKinds = ["buy", "sell", "cash"] as const;

export type RecordKind = (typeof recordKinds)[number];

/** Record a change's steps, in order, then the saved screen. */
export const recordSteps = [
  "what",
  "share",
  "when",
  "amount",
  "review",
  "saved",
] as const;

export type RecordStep = (typeof recordSteps)[number];

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Record a change's search: `entry`, the share change or cash balance it
 * edits; or `kind`, with `share` for a purchase or a sale, the steps it
 * skips. Then the flow's own: `step`, the step shown, `start`, the step it
 * opened on, `day`, the day picked, `amount`, the quantity or the cash
 * entered, and `draft`, the draft's id, which a new entry's id derives from.
 * Each is left out when it is not valid.
 */
export type RecordSearch = {
  draft?: Id | undefined;
  entry?: Id | undefined;
  kind?: RecordKind | undefined;
  share?: Id | undefined;
  step?: RecordStep | undefined;
  start?: RecordStep | undefined;
  day?: IsoDate | undefined;
  amount?: Decimal | undefined;
};

/** A decimal from the address: the router reads a bare `10` as a number. */
function decimalIn(value: unknown): Decimal | undefined {
  const text = typeof value === "number" ? String(value) : value;
  return typeof text === "string" && decimalPattern.test(text)
    ? text
    : undefined;
}

export function validateRecordSearch(
  search: Omit<RecordSearch, "amount"> & {
    amount?: Decimal | number | undefined;
  } & SearchSchemaInput,
): RecordSearch {
  return {
    draft: idIn(search.draft),
    entry: idIn(search.entry),
    kind: oneOf(recordKinds, search.kind),
    share: idIn(search.share),
    step: oneOf(recordSteps, search.step),
    start: oneOf(recordSteps, search.start),
    day:
      typeof search.day === "string" && ISO_DATE.test(search.day)
        ? search.day
        : undefined,
    amount: decimalIn(search.amount),
  };
}

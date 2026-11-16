import type { Id } from "@fpr/contracts";
import type { SearchSchemaInput } from "@tanstack/react-router";
import { oneOf } from "./one-of";
import { idIn } from "./view-state/view-search";

/** What Record a change opens on: a purchase or a sale of `share`, or cash. */
const recordKinds = ["buy", "sell", "cash"] as const;

/**
 * Record a change's search: `entry`, the share change or cash balance it
 * edits; or `kind`, the step it starts at, with `share` for a purchase or a
 * sale. Each is left out when it is not valid.
 */
export type RecordSearch = {
  entry?: Id | undefined;
  kind?: (typeof recordKinds)[number] | undefined;
  share?: Id | undefined;
};

export function validateRecordSearch(
  search: RecordSearch & SearchSchemaInput,
): RecordSearch {
  return {
    entry: idIn(search.entry),
    kind: oneOf(recordKinds, search.kind),
    share: idIn(search.share),
  };
}

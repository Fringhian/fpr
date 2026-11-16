import type { SearchSchemaInput } from "@tanstack/react-router";
import { isinIn } from "./isin";
import { appPath } from "./session/access";

/**
 * Create a manual share's search: `isin`, filled in from the lookup; `back`,
 * the page it was opened from, which Close returns to; and `pick`, set by
 * Record a change, to return to `back` with the new share picked rather
 * than open its page. Each is left out when it is not valid.
 */
export type NewShareSearch = {
  isin?: string | undefined;
  back?: string | undefined;
  pick?: true | undefined;
};

export function validateNewShareSearch(
  search: NewShareSearch & SearchSchemaInput,
): NewShareSearch {
  return {
    isin:
      typeof search.isin === "string"
        ? (isinIn(search.isin) ?? undefined)
        : undefined,
    back: appPath(search.back),
    pick: search.pick === true ? true : undefined,
  };
}

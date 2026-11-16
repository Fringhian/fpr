import type { Timestamp } from "@fpr/contracts";
import { raceDayEnd, raceDayOf } from "./race-day";

// A date field holds a race day as `YYYY-MM-DD`, or `""` for none.

/** A moment's race day, as a date field holds it: `2027-06-30`, or `""` for none. */
export function dayOf(at: Timestamp | null): string {
  return at === null ? "" : raceDayOf(at);
}

/** The last second of a date field's race day, or `null` for an empty field. */
export function endOfDay(day: string): Timestamp | null {
  return day === "" ? null : raceDayEnd(day);
}

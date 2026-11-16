import type { IsoDate, Timestamp } from "@fpr/contracts";
import { formatTime } from "../../../lib/format/date";
import { localInstant, RACE_TIME_ZONE } from "../../../lib/race-day";

/** Add a value's fields as typed: the day, the time of day `HH:MM` in the race's zone, and the value of one unit. */
export type ValueDraft = { day: IsoDate; time: string; price: string };

const TIME = /^(?:[01]\d|2[0-3]):[0-5]\d$/;

/** The time of day now in the race's zone, `HH:MM`. */
export function timeNow(): string {
  return formatTime(new Date().toISOString(), "en", {
    timeZone: RACE_TIME_ZONE,
  });
}

/** The moment the day and time name, in the race's zone, or `null` while the time isn't one. */
export function momentOf(day: IsoDate, time: string): Timestamp | null {
  return TIME.test(time)
    ? new Date(localInstant(day, `${time}:00`)).toISOString()
    : null;
}

/** Whether the day and time are a moment that hasn't come yet. */
export function isFuture(day: IsoDate, time: string): boolean {
  const moment = momentOf(day, time);
  return moment !== null && Date.parse(moment) > Date.now();
}

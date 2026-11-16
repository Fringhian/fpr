import type { Timestamp } from "@fpr/contracts";

// A date field holds a day as `YYYY-MM-DD`, read in the browser's time zone.

const pad = (value: number) => String(value).padStart(2, "0");

function dateOf(day: string): [number, number, number] {
  const [year = 0, month = 1, date = 1] = day.split("-").map(Number);
  return [year, month - 1, date];
}

/** A moment's day, as a date field holds it: `2027-06-30`, or `""` for none. */
export function dayOf(at: Timestamp | null): string {
  if (at === null) {
    return "";
  }
  const date = new Date(at);
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** Today, as a date field holds it. */
export function today(): string {
  return dayOf(new Date().toISOString());
}

/** The first moment of a date field's day. */
export function startOfDay(day: string): Timestamp {
  return new Date(...dateOf(day)).toISOString();
}

/** The last second of a date field's day, or `null` for an empty field. */
export function endOfDay(day: string): Timestamp | null {
  return day === "" ? null : new Date(...dateOf(day), 23, 59, 59).toISOString();
}

import type { IsoDate } from "@fpr/contracts";

/** The day a moment falls on in a time zone, as `YYYY-MM-DD`. */
export function dayIn(moment: Date, timeZone: string): IsoDate {
  const parts = new Intl.DateTimeFormat("en", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(moment);
  const part = (type: Intl.DateTimeFormatPartTypes): string =>
    parts.find((candidate) => candidate.type === type)?.value ?? "";
  return `${part("year")}-${part("month")}-${part("day")}`;
}

/** A calendar day moved by a number of days, negative to go back. */
export function addDays(day: IsoDate, days: number): IsoDate {
  const moved = new Date(`${day}T00:00:00Z`);
  moved.setUTCDate(moved.getUTCDate() + days);
  return moved.toISOString().slice(0, 10);
}

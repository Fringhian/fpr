import type { IsoDate, Language } from "@fpr/contracts";
import { INTL_LOCALE } from "../../../lib/language";
import { addDays } from "../../../lib/race-day";

const DAY_MS = 24 * 60 * 60 * 1000;

// A Monday: the week starts there, in English (UK) as in French.
const MONDAY = Date.UTC(2024, 0, 1, 12);

/** The week's days, Monday first: one letter, and the full name screen readers hear. */
export function weekdays(language: Language) {
  const format = (weekday: "narrow" | "long") =>
    new Intl.DateTimeFormat(INTL_LOCALE[language], {
      weekday,
      timeZone: "UTC",
    });
  return Array.from({ length: 7 }, (_, index) => {
    const at = MONDAY + index * DAY_MS;
    return {
      short: format("narrow").format(at),
      long: format("long").format(at),
    };
  });
}

/** The month and its year: “March 2026”, « mars 2026 ». */
export function monthName(month: IsoDate, language: Language): string {
  return new Intl.DateTimeFormat(INTL_LOCALE[language], {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${month}T12:00:00Z`));
}

/** The first day of the month `day` falls in. */
export function monthOf(day: IsoDate): IsoDate {
  return `${day.slice(0, 7)}-01`;
}

/** The first day of the month `months` after `month`'s, or before it when negative. */
export function addMonths(month: IsoDate, months: number): IsoDate {
  const date = new Date(`${monthOf(month)}T12:00:00Z`);
  date.setUTCMonth(date.getUTCMonth() + months);
  return date.toISOString().slice(0, 10);
}

// 0 for Monday, 6 for Sunday: JavaScript's week starts on Sunday.
function weekdayOf(day: IsoDate): number {
  return (new Date(`${day}T12:00:00Z`).getUTCDay() + 6) % 7;
}

/**
 * The month's weeks, Monday first: its days, with `null` before the first
 * and after the last to fill their weeks.
 */
export function monthWeeks(month: IsoDate): (IsoDate | null)[][] {
  const first = monthOf(month);
  const cells: (IsoDate | null)[] = Array.from(
    { length: weekdayOf(first) },
    () => null,
  );
  for (let day = first; monthOf(day) === first; day = addDays(day, 1)) {
    cells.push(day);
  }
  while (cells.length % 7 !== 0) cells.push(null);
  return Array.from({ length: cells.length / 7 }, (_, week) =>
    cells.slice(week * 7, week * 7 + 7),
  );
}

/** The day a key moves to from `day`: a day along, a week, or a month's start or end. */
export function dayAfterKey(day: IsoDate, key: string): IsoDate | null {
  switch (key) {
    case "ArrowLeft":
      return addDays(day, -1);
    case "ArrowRight":
      return addDays(day, 1);
    case "ArrowUp":
      return addDays(day, -7);
    case "ArrowDown":
      return addDays(day, 7);
    case "Home":
      return monthOf(day);
    case "End":
      return addDays(addMonths(day, 1), -1);
    case "PageUp":
      return addMonths(day, -1);
    case "PageDown":
      return addMonths(day, 1);
    default:
      return null;
  }
}

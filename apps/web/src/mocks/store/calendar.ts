import type { IsoDate, Period, Timestamp } from "@fpr/contracts";

/** The race's time zone, `RACE_TIMEZONE`: where a day starts. */
const zone = "Europe/Paris";

const DAY_MS = 24 * 60 * 60 * 1000;

const offsetFormat = new Intl.DateTimeFormat("en-US", {
  timeZone: zone,
  timeZoneName: "longOffset",
});

const dayFormat = new Intl.DateTimeFormat("en-CA", { timeZone: zone });

function offsetMs(atMs: number): number {
  const name =
    offsetFormat.formatToParts(atMs).find(({ type }) => type === "timeZoneName")
      ?.value ?? "";
  const match = /GMT([+-])(\d{2}):(\d{2})/.exec(name);
  if (match === null) {
    return 0;
  }
  const minutes = Number(match[2]) * 60 + Number(match[3]);
  return (match[1] === "-" ? -minutes : minutes) * 60 * 1000;
}

/** The instant of a time of day, `HH:MM:SS`, on a day in the race's zone. */
export function localInstant(day: IsoDate, time: string): number {
  const asUtc = Date.parse(`${day}T${time}Z`);
  const first = asUtc - offsetMs(asUtc);
  return asUtc - offsetMs(first);
}

/** The day an instant falls on in the race's zone. */
export function dayOf(atMs: number): IsoDate {
  return dayFormat.format(atMs);
}

export function timestamp(atMs: number): Timestamp {
  return new Date(atMs).toISOString();
}

export function addDays(day: IsoDate, days: number): IsoDate {
  return new Date(Date.parse(`${day}T12:00:00Z`) + days * DAY_MS)
    .toISOString()
    .slice(0, 10);
}

export function isTradingDay(day: IsoDate): boolean {
  const weekday = new Date(`${day}T12:00:00Z`).getUTCDay();
  return weekday !== 0 && weekday !== 6;
}

/** The trading day itself, or the last one before it. */
export function tradingDayOnOrBefore(day: IsoDate): IsoDate {
  let current = day;
  while (!isTradingDay(current)) {
    current = addDays(current, -1);
  }
  return current;
}

/** Every trading day from `from` to `to`, both included. */
export function tradingDays(from: IsoDate, to: IsoDate): IsoDate[] {
  const days: IsoDate[] = [];
  for (let day = from; day <= to; day = addDays(day, 1)) {
    if (isTradingDay(day)) {
      days.push(day);
    }
  }
  return days;
}

/** A close is the price at 23:59:59 of its day. */
export function closeAt(day: IsoDate): number {
  return localInstant(day, "23:59:59");
}

/** The 30-minute refreshes of a trading day, 09:00 to 17:30. */
export function refreshInstants(day: IsoDate): number[] {
  return Array.from({ length: 18 }, (_, step) => {
    const minutes = 9 * 60 + step * 30;
    const time = `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}:00`;
    return localInstant(day, time);
  });
}

/**
 * The market as of the store's clock: the last close is the trading day
 * before today, as closes arrive overnight, and today's refreshes until now
 * are provisional.
 */
export type Calendar = {
  nowMs: number;
  today: IsoDate;
  lastCloseOn: IsoDate;
  refreshesRunning: boolean;
  /** The market day's refreshes so far, the provisional points. */
  provisional: number[];
};

/**
 * The market as of `now`. The market day is today once its refreshes start,
 * else the trading day before, whose close the mock never records: its
 * refreshes stay provisional until the next market day, so "today, not
 * final" points show at any hour. The last close is the trading day before
 * the market day.
 */
export function createCalendar(now: Date): Calendar {
  const nowMs = now.getTime();
  const today = dayOf(nowMs);
  const opened =
    isTradingDay(today) && localInstant(today, "09:00:00") <= nowMs;
  const marketDay = opened ? today : tradingDayOnOrBefore(addDays(today, -1));
  const refreshes = refreshInstants(marketDay);
  const provisional = refreshes.filter((atMs) => atMs <= nowMs);
  const last = refreshes.at(-1) ?? 0;
  return {
    nowMs,
    today,
    lastCloseOn: tradingDayOnOrBefore(addDays(marketDay, -1)),
    refreshesRunning: opened && nowMs <= last,
    provisional,
  };
}

/**
 * The trading day whose close a period's gain starts from, as of the last
 * close. `all` starts before `earliest`, the first entry it covers.
 */
export function periodStartDay(
  calendar: Calendar,
  period: Period,
  earliest: IsoDate,
): IsoDate {
  const last = calendar.lastCloseOn;
  const back = (days: number) => tradingDayOnOrBefore(addDays(last, -days));
  switch (period) {
    case "1D":
      return back(1);
    case "1W":
      return back(7);
    case "1M":
      return back(30);
    case "3M":
      return back(91);
    case "YTD":
      return tradingDayOnOrBefore(`${Number(last.slice(0, 4)) - 1}-12-31`);
    case "all":
      return tradingDayOnOrBefore(addDays(earliest, -1));
  }
}

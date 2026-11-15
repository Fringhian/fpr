import type { NewPrice } from "@fpr/db";
import type { SeedListing } from "./seed-data.js";

export const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * The UTC instant of a wall-clock time on a calendar day in a time zone,
 * such as 23:59:59 on `2026-03-02` in `Europe/Paris`.
 */
function zonedMoment(
  day: string,
  time: readonly [hours: number, minutes: number, seconds: number],
  timeZone: string,
): Date {
  const [year, month, date] = day.split("-").map(Number) as [
    number,
    number,
    number,
  ];
  const wallClock = Date.UTC(year, month - 1, date, ...time);
  const format = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  const offset = (instant: number): number => {
    const parts = Object.fromEntries(
      format.formatToParts(instant).map((part) => [part.type, part.value]),
    );
    const asUtc = Date.UTC(
      Number(parts.year),
      Number(parts.month) - 1,
      Number(parts.day),
      Number(parts.hour),
      Number(parts.minute),
      Number(parts.second),
    );
    return asUtc - instant;
  };
  const guess = wallClock - offset(wallClock);
  return new Date(wallClock - offset(guess));
}

/** A small seeded generator, so every seed draws the same closes. */
function mulberry32(seed: number): () => number {
  let state = seed;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** `YYYY-MM-DD` of a UTC instant. */
const isoDay = (instant: number): string =>
  new Date(instant).toISOString().slice(0, 10);

/**
 * Invented daily closes of a listing, one per weekday from `fromDay` to the
 * day before `toDay`, each stored at 23:59:59 of its day in `timeZone`. The
 * listing's `index` seeds the draw.
 */
export function inventCloses(
  listing: SeedListing,
  index: number,
  fromDay: number,
  toDay: number,
  timeZone: string,
): Omit<NewPrice, "shareId">[] {
  const random = mulberry32(index + 1);
  let price = listing.firstCloseEur;
  const closes: Omit<NewPrice, "shareId">[] = [];
  for (let day = fromDay; day < toDay; day += DAY_MS) {
    const weekday = new Date(day).getUTCDay();
    if (weekday === 0 || weekday === 6) continue;
    const noise = random() + random() + random() - 1.5;
    price *= Math.exp(listing.drift + listing.volatility * 2 * noise);
    closes.push({
      at: zonedMoment(isoDay(day), [23, 59, 59], timeZone),
      priceEur: price.toFixed(4),
      source: "close",
      enteredBy: null,
    });
  }
  return closes;
}

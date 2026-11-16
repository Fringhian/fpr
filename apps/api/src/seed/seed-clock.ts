export const DAY_MS = 24 * 60 * 60 * 1000;

/** How many days before the seed runs the race starts. */
export const RACE_LENGTH_DAYS = 240;

/**
 * The race's calendar. The seed data places every moment on a day counted
 * from the race's start, `RACE_LENGTH_DAYS` before the seed runs.
 */
export interface RaceClock {
  /** The seed's clock. */
  now: Date;
  /**
   * Midnight UTC of the day the seed runs, in milliseconds. The race ends the
   * day before.
   */
  today: number;
  /** Midnight UTC of the race's first day, in milliseconds. */
  start: number;
  /** A moment on a day of the race, in UTC. */
  at(day: number, hours?: number): Date;
}

export function raceClock(now: Date): RaceClock {
  const today = Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate(),
  );
  const start = today - RACE_LENGTH_DAYS * DAY_MS;
  return {
    now,
    today,
    start,
    at: (day, hours = 10) =>
      new Date(start + day * DAY_MS + hours * 60 * 60 * 1000),
  };
}

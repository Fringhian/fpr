/**
 * A small race for the tests of the read routes, on a fixed clock. Not part
 * of the build.
 */
import type { Db, Share } from "@fpr/db";
import type { Auth } from "../src/auth/auth.js";
import {
  createSeriesCache,
  type SeriesCache,
} from "../src/valuation/series-cache.js";
import {
  addPerson,
  addShare,
  TEST_RACE_TIMEZONE,
  type TestPerson,
} from "./test-support.js";

/**
 * Wednesday 11 November 2026, noon in Paris: the last close is Tuesday's,
 * and Wednesday's 10:00 refresh is provisional.
 */
export const RACE_NOW = new Date("2026-11-11T12:00:00+01:00");

/** The balance series as of `RACE_NOW`. */
export function raceSeries(db: Db): SeriesCache {
  return createSeriesCache({
    db,
    timeZone: TEST_RACE_TIMEZONE,
    now: () => RACE_NOW,
  });
}

const close = (day: string) => new Date(`${day}T23:59:59+01:00`);

/** Each share's closes, from Monday 2 November to Tuesday 10 November. */
const closes = {
  a: {
    "2026-11-02": "10",
    "2026-11-03": "10",
    "2026-11-04": "11",
    "2026-11-05": "11",
    "2026-11-06": "11",
    "2026-11-09": "12",
    "2026-11-10": "15",
  },
  b: {
    "2026-11-02": "20",
    "2026-11-03": "20",
    "2026-11-04": "20",
    "2026-11-05": "20",
    "2026-11-06": "20",
    "2026-11-09": "20",
    "2026-11-10": "18",
  },
};

async function addPrices(db: Db, share: Share, byDay: Record<string, string>) {
  await db
    .insertInto("prices")
    .values(
      Object.entries(byDay).map(([day, priceEur]) => ({
        shareId: share.id,
        at: close(day),
        priceEur,
        source: "close" as const,
      })),
    )
    .execute();
}

export async function addChange(
  db: Db,
  person: TestPerson,
  share: Share,
  quantityDelta: string,
  effectiveAt: string,
) {
  await db
    .insertInto("portfolioChanges")
    .values({
      userId: person.id,
      shareId: share.id,
      quantityDelta,
      effectiveAt: new Date(effectiveAt),
      createdBy: person.id,
    })
    .execute();
}

export async function addCash(
  db: Db,
  person: TestPerson,
  amountEur: string,
  effectiveAt: string,
) {
  await db
    .insertInto("cashBalances")
    .values({
      userId: person.id,
      amountEur,
      effectiveAt: new Date(effectiveAt),
      createdBy: person.id,
    })
    .execute();
}

/**
 * The race:
 *
 * - share A closes at 10, 10, 11, 11, 11, 12, then 15 on Tuesday, and is at
 *   16 at Wednesday's 10:00 refresh; share B closes at 20, then 18 on
 *   Tuesday; share C has no price yet; nobody ever held share D;
 * - Alex holds 10 A and 90 € from Monday 2 November: 210 € at Monday 9's
 *   close, 240 € at Tuesday's, 250 € at Wednesday's refresh;
 * - Blake holds 5 B from Monday 2, and buys 10 A on Monday 9: 220 €, then
 *   240 € at Tuesday's close, tied with Alex;
 * - Cleo starts on Thursday 5 with 2 C, still pending, and 50 €: incomplete;
 * - Dana has no entry yet.
 */
export async function addRace(db: Db, auth: Auth) {
  const alex = await addPerson(db, auth, "member");
  const blake = await addPerson(db, auth, "member");
  const cleo = await addPerson(db, auth, "member");
  const dana = await addPerson(db, auth, "member");
  const a = await addShare(db);
  const b = await addShare(db);
  const c = await addShare(db);
  const d = await addShare(db);
  await addPrices(db, a, closes.a);
  await addPrices(db, b, closes.b);
  await db
    .insertInto("prices")
    .values({
      shareId: a.id,
      at: new Date("2026-11-11T10:00:00+01:00"),
      priceEur: "16",
      source: "intraday",
      createdAt: new Date("2026-11-11T10:02:00+01:00"),
    })
    .execute();
  await addChange(db, alex, a, "10", "2026-11-02T10:00:00+01:00");
  await addCash(db, alex, "90", "2026-11-02T10:00:00+01:00");
  await addChange(db, blake, b, "5", "2026-11-02T11:00:00+01:00");
  await addChange(db, blake, a, "10", "2026-11-09T10:00:00+01:00");
  await addChange(db, cleo, c, "2", "2026-11-05T10:00:00+01:00");
  await addCash(db, cleo, "50", "2026-11-05T10:00:00+01:00");
  return { alex, blake, cleo, dana, shares: { a, b, c, d } };
}
